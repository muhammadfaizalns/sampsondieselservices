"""Check shipped pages, assets, metadata and agreed content constraints."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / 'dist'
errors = []

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.tags, self.ids, self.text, self.schemas = path, [], [], [], []
        self.hidden = 0
        self.ld = False
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        if tag in ('script', 'style'):
            self.hidden += 1
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.ld = True
        for key in ('alt', 'aria-label', 'placeholder', 'title'):
            if attrs.get(key):
                self.text.append(attrs[key])

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden -= 1
            self.ld = False

    def handle_data(self, data):
        if self.ld:
            try:
                self.schemas.append(json.loads(data))
            except ValueError:
                errors.append(f'{self.path}: invalid JSON-LD')
        if not self.hidden:
            self.text.append(data)

pages = {p.resolve(): Page(p) for p in ROOT.rglob('*.html')}
titles, canonical_urls = [], []
for path, page in pages.items():
    label = path.relative_to(ROOT)
    if len(page.ids) != len(set(page.ids)):
        errors.append(f'{label}: duplicate IDs')
    if sum(tag == 'h1' for tag, _ in page.tags) != 1:
        errors.append(f'{label}: expected one h1')
    if re.search(r'[-\u2013\u2014]', ' '.join(page.text)):
        errors.append(f'{label}: dash in visible text')
    if 'labour hire' in ' '.join(page.text).lower():
        errors.append(f'{label}: labour hire needs owner verification')
    meta = {attrs.get('name') or attrs.get('property'): attrs.get('content') for tag, attrs in page.tags if tag == 'meta'}
    for required in ('description', 'viewport', 'og:image'):
        if not meta.get(required):
            errors.append(f'{label}: missing {required}')
    canonical = [a['href'] for t, a in page.tags if t == 'link' and a.get('rel') == 'canonical']
    if len(canonical) != 1:
        errors.append(f'{label}: expected one canonical')
    if meta.get('robots') != 'noindex':
        titles.append(re.search(r'<title>(.*?)</title>', path.read_text(), re.S).group(1))
        canonical_urls.extend(canonical)
    if not page.schemas:
        errors.append(f'{label}: missing structured data')
    for tag, attrs in page.tags:
        link = attrs.get('href') or attrs.get('src')
        if not link or urlparse(link).scheme or link.startswith('//'):
            continue
        route = '/' + str(label).replace('index.html', '')
        parsed = urlparse(urljoin(route, link))
        target = ROOT / unquote(parsed.path).lstrip('/')
        if target.is_dir():
            target /= 'index.html'
        if not target.exists():
            errors.append(f'{label}: missing {link}')
        elif parsed.fragment and target.resolve() in pages and parsed.fragment not in pages[target.resolve()].ids:
            errors.append(f'{label}: missing fragment {link}')

if len(titles) != len(set(titles)):
    errors.append('Duplicate indexable titles')
sitemap = ET.parse(ROOT / 'sitemap.xml')
locations = [node.text for node in sitemap.findall('.//{*}loc')]
if set(locations) != set(canonical_urls):
    errors.append('Sitemap and canonical page lists differ')
components = json.loads((ROOT / 'components.js').read_text().split('=', 1)[1].strip().rstrip(';'))
if len(components) < 10:
    errors.append('Fewer than ten components')
for component in components:
    if not (ROOT / 'assets/models' / (component['file'] + '.glb')).is_file():
        errors.append('Missing model: ' + component['file'])
rows = json.loads((ROOT / 'assets/data/vic-localities-postcodes.json').read_text())
assert ['Dandenong', '3175'] in rows
if errors:
    raise SystemExit('\n'.join(errors))
print(json.dumps({'html_files': len(pages), 'sitemap_pages': len(locations), 'models': len(components), 'locality_postcode_pairs': len(rows), 'result': 'passed'}))
