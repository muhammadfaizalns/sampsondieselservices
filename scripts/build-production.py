"""Build an isolated, indexable static site for the approved business domain."""
import argparse
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

from site_urls import HomeMetadata, normalize_origin


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ORIGIN = 'https://sampsonheavydiesel.com'
MARKER = '.sampson-production-build'
ROBOTS = re.compile(r'<meta\b(?=[^>]*\bname\s*=\s*[\"\']robots[\"\'])[^>]*>', re.I)
GA4_ID = re.compile(r'G-[A-Z0-9]{10}\Z')
STATIC_EXTENSIONS = {
    '.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.glb',
    '.png', '.webp', '.svg', '.jpg', '.jpeg', '.gif', '.avif', '.ico',
    '.woff', '.woff2', '.ttf', '.otf',
}
OBSOLETE_ASSETS = {'logo.svg', 'monogram.png', 'engine-poster.webp',
                   'gearbox-poster.webp', 'gear-geometry.js'}


def measurement_settings(value):
    """Measurement IDs are public identifiers; account credentials are not accepted."""
    if value in (None, ''):
        return None
    if not isinstance(value, str) or not GA4_ID.fullmatch(value):
        raise ValueError('GA4_MEASUREMENT_ID must be G- followed by 10 uppercase letters or digits.')
    return value


def copy_filter(directory, names):
    ignored = []
    for name in names:
        path = Path(directory) / name
        if (name.startswith('.') or path.is_symlink()
                or (path.is_file() and path.suffix.lower() not in STATIC_EXTENSIONS)
                or name.startswith(('wrangler.', 'package.', 'package-lock.', 'tsconfig.'))
                or re.search(r'(?:^|[._-])(?:secrets?|credentials?)(?:[._-]|$)', name, re.I)):
            ignored.append(name)
    return ignored


def security_headers(origin):
    """Headers target static assets; host redirects are configured separately in Cloudflare."""
    csp = '; '.join([
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com",
        "script-src-attr 'none'",
        "style-src 'self'",
        "style-src-attr 'none'",
        "img-src 'self' data: blob: https://*.google-analytics.com",
        "font-src 'self'",
        "connect-src 'self' blob: https://cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
        "media-src 'self'",
        "manifest-src 'self'",
        "worker-src 'none'",
        "object-src 'none'",
        "frame-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
    ])
    headers = f'''/*
  Content-Security-Policy: {csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  ! Cache-Control
  Cache-Control: public, max-age=86400

{origin}/*
  Strict-Transport-Security: max-age=86400

https://:project.pages.dev/*
  X-Robots-Tag: noindex, nofollow

https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex, nofollow

https://:worker.:account.workers.dev/*
  X-Robots-Tag: noindex, nofollow

https://:version.:worker.:account.workers.dev/*
  X-Robots-Tag: noindex, nofollow
'''
    if any(len(line) > 2000 for line in headers.splitlines()):
        raise ValueError('Generated security header exceeds Cloudflare line limits.')
    return headers


def rewrite_html(source, previous_origin, origin, not_found=False, measurement_id=None):
    rendered = ROBOTS.sub('', source.replace(previous_origin, origin))
    indexing = 'noindex, follow' if not_found else 'index, follow, max-image-preview:large'
    additions = f'<meta name="robots" content="{indexing}">'
    if measurement_id:
        host = html.escape(urlsplit(origin).hostname, quote=True)
        additions += ('<link rel="stylesheet" href="/analytics.css">'
                      f'<script src="/analytics.js" defer data-ga4-id="{measurement_id}" '
                      f'data-host="{host}"></script>')
    if '</head>' not in rendered:
        raise ValueError('Production HTML is missing its closing head element.')
    return rendered.replace('</head>', additions + '</head>', 1)


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.refs, self.canonical, self.ids, self.robots = [], [], set(), []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        for key in ('href', 'src', 'poster', 'action'):
            if key in attrs:
                self.refs.append(attrs[key])
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs.get('href', ''))
        if tag == 'meta' and attrs.get('name', '').lower() == 'robots':
            self.robots.append(attrs.get('content', ''))


def is_not_found(relative):
    return relative.as_posix() in ('404.html', '404/index.html')


def validate(output, origin, previous_origin, active_models):
    errors, indexable = [], set()
    documents = {path: Document(path.read_text()) for path in output.rglob('*.html')}
    for path, document in documents.items():
        relative = path.relative_to(output)
        not_found = is_not_found(relative)
        route = '/404/' if not_found else '/' + relative.as_posix().removesuffix('index.html')
        expected = origin + route
        if document.canonical != [expected]:
            errors.append(f'{relative}: canonical must equal {expected}')
        tokens = {token.strip() for token in ','.join(document.robots).lower().split(',')}
        if len(document.robots) != 1 or (('noindex' in tokens) != not_found):
            errors.append(f'{relative}: invalid production indexing policy')
        if not not_found:
            indexable.add(expected)
        source = path.read_text()
        if previous_origin != origin and previous_origin in source:
            errors.append(f'{relative}: stale source origin')
        for block in re.findall(r'<script\b[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>', source, re.S | re.I):
            try:
                json.loads(block)
            except ValueError:
                errors.append(f'{relative}: invalid structured data')
        for ref in document.refs:
            resolved = urlsplit(urljoin(expected, ref))
            if resolved.scheme not in ('https', 'http') or resolved.netloc != urlsplit(origin).netloc:
                continue
            target = output / unquote(resolved.path).lstrip('/')
            if target.is_dir():
                target /= 'index.html'
            if not target.is_file():
                errors.append(f'{relative}: missing local target {ref}')
            elif resolved.fragment and target in documents and resolved.fragment not in documents[target].ids:
                errors.append(f'{relative}: missing local fragment {ref}')
    sitemap = [node.text for node in ET.parse(output / 'sitemap.xml').findall('.//{*}loc')]
    if len(sitemap) != len(set(sitemap)) or set(sitemap) != indexable:
        errors.append('Production sitemap must match indexable canonical URLs exactly.')
    for name in active_models:
        if not (output / 'assets/models' / (name + '.glb')).is_file():
            errors.append(f'Missing active model: {name}')
    if errors:
        raise ValueError('\n'.join(errors))
    return {'html_files': len(documents), 'sitemap_pages': len(sitemap),
            'models': len(active_models), 'site_url': origin, 'result': 'passed'}


def build(source, output, site_url=DEFAULT_ORIGIN, measurement_id=None,
          privacy_template=None, google_privacy_template=None):
    source, output = Path(source).resolve(), Path(output).resolve()
    origin = normalize_origin(site_url)
    measurement_id = measurement_settings(measurement_id)
    if source == output or source in output.parents or output in source.parents:
        raise ValueError('Output must be separate from the source directory.')
    metadata = HomeMetadata((source / 'index.html').read_text())
    if len(metadata.canonicals) != 1:
        raise ValueError('Source homepage must have exactly one root canonical URL.')
    previous_origin = normalize_origin(metadata.canonicals[0])
    manifest = json.loads((source / 'components.js').read_text().split('=', 1)[1].strip().rstrip(';'))
    active_models = {item['file'] for item in manifest}
    if not active_models or any(not re.fullmatch(r'[a-zA-Z0-9_-]+', name) for name in active_models):
        raise ValueError('Assembly manifest contains invalid model filenames.')
    if measurement_id and any(not (source / name).is_file() for name in ('analytics.js', 'analytics.css')):
        raise ValueError('Configured GA4 requires analytics.js and analytics.css in the source.')
    privacy_content = None
    if (source / 'privacy/index.html').is_file():
        if privacy_template is None:
            privacy_template = (ROOT / 'scripts/production-privacy.html').read_text()
        if privacy_template.count('{{GOOGLE_ANALYTICS_NOTICE}}') != 1:
            raise ValueError('Production privacy template must contain one Google Analytics notice placeholder.')
        if measurement_id:
            if google_privacy_template is None:
                google_privacy_template = (ROOT / 'scripts/production-google-privacy.html').read_text()
            google_notice = google_privacy_template
        else:
            google_notice = '<h2>Google Analytics</h2><p>Google Analytics is not enabled on this website.</p>'
        privacy_content = privacy_template.replace('{{GOOGLE_ANALYTICS_NOTICE}}', google_notice)
    if output.exists():
        if not (output / MARKER).is_file():
            raise ValueError('Refusing to overwrite a directory not created by this builder.')
        shutil.rmtree(output)
    shutil.copytree(source, output, ignore=copy_filter)
    (output / MARKER).write_text('Generated production artifact. Source remains in dist.\n')
    for path in output.rglob('*'):
        if not path.is_file():
            continue
        if path.name.startswith(('clive', 'sampson-logo')) or path.name in OBSOLETE_ASSETS:
            path.unlink()
        elif path.suffix == '.glb' and path.stem not in active_models:
            path.unlink()
        elif path.suffix == '.html':
            source_html = path.read_text()
            if path.relative_to(output).as_posix() == 'privacy/index.html':
                source_html, replacements = re.subn(
                    r'(<div class="wrap legal-prose">).*?(</div></section>)',
                    lambda match: match[1] + privacy_content + match[2],
                    source_html, count=1, flags=re.S)
                if replacements != 1:
                    raise ValueError('Privacy page is missing its legal content container.')
            path.write_text(rewrite_html(source_html, previous_origin, origin,
                                        is_not_found(path.relative_to(output)), measurement_id))
        elif path.suffix == '.xml':
            path.write_text(path.read_text().replace(previous_origin, origin))
    (output / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {origin}/sitemap.xml\n')
    (output / '_headers').write_text(security_headers(origin))
    result = validate(output, origin, previous_origin, active_models)
    result['ga4'] = 'configured with consent required' if measurement_id else 'disabled'
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-url', default=DEFAULT_ORIGIN)
    parser.add_argument('--output', type=Path, default=ROOT / '_production')
    args = parser.parse_args()
    print(json.dumps(build(ROOT / 'dist', args.output, args.site_url,
                           os.environ.get('GA4_MEASUREMENT_ID'))))
