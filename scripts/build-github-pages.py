"""Create and validate a noindex GitHub Pages review build without changing dist."""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MARKER = '.sampson-review-build'
ATTR = re.compile(r'(?P<start>\b(?:href|src|action|poster)\s*=\s*[\"\'])(?P<url>/(?!/)[^\"\']*)', re.I)
CSS_URL = re.compile(r'(?P<start>url\(\s*[\"\']?)(?P<url>/(?!/)[^\s)\"\']*)', re.I)
ROBOTS = re.compile(r'<meta\b(?=[^>]*\bname\s*=\s*[\"\']robots[\"\'])[^>]*>', re.I)
APP_JS = ('coverage.js', 'gearbox.js')


def site_settings(site_url):
    parsed = urlsplit(site_url.rstrip('/'))
    if parsed.scheme != 'https' or not parsed.netloc or parsed.query or parsed.fragment or parsed.username:
        raise ValueError('Use an HTTPS site URL without credentials, query or fragment.')
    if not re.fullmatch(r'(?:/[A-Za-z0-9._~-]+)*', parsed.path) or any(p in ('.', '..') for p in parsed.path.split('/')):
        raise ValueError('Site URL contains an unsupported path.')
    return site_url.rstrip('/'), parsed.path


def prefix_url(url, base_path):
    return base_path + url if url.startswith('/') and not url.startswith('//') else url


def rewrite_html(text, old_url, site_url, base_path):
    # Handle attributes before metadata so absolute target URLs are not prefixed twice.
    text = ATTR.sub(lambda m: m['start'] + prefix_url(m['url'], base_path), text)
    text = text.replace(old_url, site_url)
    text = ROBOTS.sub('', text)
    return text.replace('</head>', '<meta name="robots" content="noindex, nofollow, noarchive"></head>', 1)


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.refs, self.ids, self.metas, self.canonical = [], set(), {}, []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        for key in ('href', 'src', 'action', 'poster'):
            if key in attrs:
                self.refs.append(attrs[key])
        if tag == 'meta':
            self.metas[attrs.get('name') or attrs.get('property')] = attrs.get('content', '')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs.get('href', ''))


def validate(output, site_url, base_path, old_url):
    errors = []
    documents = {p: Document(p.read_text()) for p in output.rglob('*.html')}
    origin = urlsplit(site_url)

    def check_ref(ref, page_url, context):
        resolved = urlsplit(urljoin(page_url, ref))
        if resolved.scheme not in ('http', 'https') or resolved.netloc != origin.netloc:
            return
        if base_path and not resolved.path.startswith(base_path + '/'):
            errors.append(f'{context}: URL escapes project path: {ref}')
            return
        relative = unquote(resolved.path[len(base_path):]).lstrip('/')
        target = output / relative
        if target.is_dir():
            target /= 'index.html'
        if not target.is_file():
            errors.append(f'{context}: missing local target: {ref}')
        elif resolved.fragment and target in documents and resolved.fragment not in documents[target].ids:
            errors.append(f'{context}: missing fragment: {ref}')

    for path, doc in documents.items():
        relative = path.relative_to(output).as_posix()
        route = relative[:-10] if relative.endswith('index.html') else relative
        page_url = site_url + '/' + route
        if 'noindex' not in doc.metas.get('robots', '').split(', '):
            errors.append(f'{relative}: missing noindex')
        if len(doc.canonical) != 1 or not doc.canonical[0].startswith(site_url + '/'):
            errors.append(f'{relative}: invalid review canonical URL')
        for ref in doc.refs:
            check_ref(ref, page_url, relative)
        for key in ('og:url', 'og:image'):
            check_ref(doc.metas.get(key, ''), page_url, relative)
        for data in re.findall(r'<script type="application/ld\+json">(.*?)</script>', path.read_text(), re.S):
            json.loads(data)
        if old_url != site_url and old_url in path.read_text():
            errors.append(f'{relative}: stale source origin')

    for path in output.rglob('*.css'):
        for match in re.finditer(r'url\(\s*[\"\']?([^\s)\"\']+)', path.read_text()):
            check_ref(match[1], site_url + '/' + path.relative_to(output).as_posix(), path.name)
    for node in ET.parse(output / 'sitemap.xml').findall('.//{*}loc'):
        check_ref(node.text, site_url + '/', 'sitemap.xml')
        if not node.text.startswith(site_url + '/'):
            errors.append('Sitemap contains a stale origin')
    for name in APP_JS:
        text = (output / name).read_text()
        for match in re.finditer(r'([\"\'`])(/assets/)', text):
            if base_path:
                errors.append(f'{name}: unprefixed dynamic asset URL')
    data_url = base_path + '/assets/data/vic-localities-postcodes.json'
    if repr(data_url) not in (output / 'coverage.js').read_text():
        errors.append('Coverage data URL does not match deployment path')
    manifest = json.loads((output / 'components.js').read_text().split('=', 1)[1].strip().rstrip(';'))
    for model in manifest:
        check_ref(base_path + '/assets/models/' + model['file'] + '.glb', site_url + '/', model['file'])
    if errors:
        raise ValueError('\n'.join(errors))
    return {'html_files': len(documents), 'models': len(manifest), 'base_path': base_path or '/', 'robots': 'noindex', 'result': 'passed'}


def build(source, output, site_url):
    source, output = Path(source).resolve(), Path(output).resolve()
    site_url, base_path = site_settings(site_url)
    if source == output or source in output.parents or output in source.parents:
        raise ValueError('Output must be separate from the source directory.')
    home = (source / 'index.html').read_text()
    match = re.search(r'<link\s+rel="canonical"\s+href="([^"]+)"', home)
    if not match:
        raise ValueError('Source homepage is missing its canonical URL.')
    old_url = match[1].rstrip('/')
    if output.exists():
        if not (output / MARKER).is_file():
            raise ValueError('Refusing to overwrite a directory not created by this builder.')
        shutil.rmtree(output)
    shutil.copytree(source, output)
    (output / MARKER).write_text('Generated review output. Source remains in dist.\n')
    for path in output.rglob('*'):
        if path.suffix == '.html':
            path.write_text(rewrite_html(path.read_text(), old_url, site_url, base_path))
        elif path.suffix == '.css':
            path.write_text(CSS_URL.sub(lambda m: m['start'] + prefix_url(m['url'], base_path), path.read_text()))
        elif path.suffix == '.xml':
            path.write_text(path.read_text().replace(old_url, site_url))
    for name in APP_JS:
        path = output / name
        path.write_text(re.sub(r'([\"\'`])/assets/', lambda m: m[1] + base_path + '/assets/', path.read_text()))
    # Crawlers must be able to read noindex. A robots block would hide that directive.
    (output / 'robots.txt').write_text('User-agent: *\nAllow: /\n# Review HTML contains noindex directives.\n')
    (output / '.nojekyll').touch()
    result = validate(output, site_url, base_path, old_url)
    print(json.dumps(result))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-url', required=True)
    args = parser.parse_args()
    build(ROOT / 'dist', ROOT / '_site', args.site_url)
