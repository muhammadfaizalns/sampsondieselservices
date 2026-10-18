"""Offline search launch checks. These do not measure indexing, rankings or performance."""
import argparse
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ERROR_PAGES = {'404.html', '404/index.html'}
ENTITY_TYPES = {'Organization', 'LocalBusiness', 'AutoRepair', 'WebSite', 'WebPage', 'Person', 'Service'}
ORGANIZATION_TYPES = {'Organization', 'LocalBusiness', 'AutoRepair'}
VOID_TAGS = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


def compact(value):
    return ' '.join(str(value).split())


class Document(HTMLParser):
    """Read ordinary HTML metadata and body text without executing JavaScript."""
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.canonicals, self.descriptions, self.robots = [], [], []
        self.title, self.text, self.schema_text = [], [], []
        self.h1_count = 0
        self.title_count = 0
        self.stack = []
        self.in_title = False
        self.in_schema = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self.in_title = True
            self.title_count += 1
        if tag == 'h1':
            self.h1_count += 1
        if tag == 'link' and 'canonical' in attrs.get('rel', '').lower().split():
            self.canonicals.append(attrs.get('href', '').strip())
        if tag == 'meta':
            name = attrs.get('name', '').lower()
            if name == 'description':
                self.descriptions.append(attrs.get('content', '').strip())
            if name in ('robots', 'googlebot', 'bingbot'):
                self.robots.extend(re.findall(r'[a-z][a-z-]*', attrs.get('content', '').lower()))
        if tag == 'script' and attrs.get('type', '').lower().split(';')[0].strip() == 'application/ld+json':
            self.in_schema = True
            self.schema_text.append('')
        blocked = bool(self.stack and self.stack[-1][1]) or tag in ('head', 'script', 'style', 'template') or 'hidden' in attrs or attrs.get('aria-hidden', '').lower() == 'true'
        if tag not in VOID_TAGS:
            self.stack.append((tag, blocked))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'script':
            self.in_schema = False
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, value):
        if self.in_title:
            self.title.append(value)
        if self.in_schema:
            self.schema_text[-1] += value
        if not self.stack or not self.stack[-1][1]:
            self.text.append(value)


def nodes(value):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from nodes(item)
    elif isinstance(value, list):
        for item in value:
            yield from nodes(item)


def types(node):
    value = node.get('@type', [])
    return {item.rstrip('/').rsplit('/', 1)[-1] for item in (value if isinstance(value, list) else [value]) if isinstance(item, str)}


def settings(site_url):
    parsed = urlsplit(site_url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('site-url must be an absolute HTTPS URL without credentials, query or fragment')
    if any(part in ('.', '..') for part in unquote(parsed.path).split('/')) or '\\' in unquote(parsed.path):
        raise ValueError('site-url must not contain traversal or backslashes')
    return site_url.rstrip('/'), parsed.path.rstrip('/')


def wildcard_rules(text):
    """Read wildcard robots groups, retaining Allow exceptions and path patterns."""
    groups, agents, rules = [], [], []
    for line in text.splitlines() + ['User-agent: __end__']:
        line = line.split('#', 1)[0].strip()
        if ':' not in line:
            continue
        key, value = (part.strip() for part in line.split(':', 1))
        key = key.lower()
        if key == 'user-agent':
            if rules:
                groups.append((agents, rules))
                agents, rules = [], []
            agents.append(value.lower())
        elif key in ('allow', 'disallow') and agents and value:
            rules.append((key, value))
    return [rule for group_agents, group_rules in groups if '*' in group_agents for rule in group_rules]


def wildcard_blocked(url, rules):
    path = urlsplit(url).path or '/'
    matches = []
    for directive, pattern in rules:
        expression = re.escape(pattern).replace(r'\*', '.*')
        expression = expression[:-2] + '$' if expression.endswith(r'\$') else expression
        if re.match(expression, path):
            matches.append((len(pattern.replace('*', '').rstrip('$')), directive == 'allow'))
    return bool(matches) and not max(matches)[1]


def audit(directory, site_url, mode):
    if mode not in ('review', 'production'):
        raise ValueError('mode must be review or production')
    site_url, base_path = settings(site_url)
    directory = Path(directory).resolve()
    findings = []

    def finding(code, message, page=None, severity='error'):
        item = {'severity': severity, 'code': code, 'message': message}
        if page is not None:
            item['page'] = str(page)
        findings.append(item)

    def local_path(url):
        parsed = urlsplit(url)
        origin = urlsplit(site_url)
        if parsed.scheme != origin.scheme or parsed.netloc.lower() != origin.netloc.lower() or parsed.query or parsed.fragment or parsed.username:
            return None
        if base_path and not parsed.path.startswith(base_path + '/'):
            return None
        relative = unquote(parsed.path[len(base_path):]).lstrip('/')
        if '\\' in relative or any(part in ('.', '..') for part in relative.split('/')):
            return None
        target = directory / relative
        if parsed.path.endswith('/') or target.is_dir():
            target /= 'index.html'
        return target

    documents = {}
    for path in sorted(directory.rglob('*.html')):
        label = path.relative_to(directory).as_posix()
        try:
            documents[label] = Document(path.read_text(encoding='utf-8'))
        except (OSError, UnicodeError) as error:
            finding('html_unreadable', str(error), label)
    if not documents:
        finding('html_missing', 'No readable HTML pages found.')
    locations = []
    sitemap_path = directory / 'sitemap.xml'
    try:
        sitemap = ET.parse(sitemap_path)
        if sitemap.getroot().tag.rsplit('}', 1)[-1] != 'urlset':
            finding('sitemap_type', 'Expected a URL sitemap (urlset), not a sitemap index.')
        locations = [(node.text or '').strip() for node in sitemap.findall('.//{*}loc')]
        if not locations:
            finding('sitemap_empty', 'Sitemap contains no page URLs.')
    except (OSError, ET.ParseError) as error:
        finding('sitemap_invalid', str(error), 'sitemap.xml')
    for url, count in Counter(locations).items():
        if count > 1:
            finding('sitemap_duplicate', 'Repeated sitemap URL.', url)
    sitemap_labels = set()
    for url in locations:
        target = local_path(url)
        if target is None:
            finding('sitemap_url', 'Sitemap URL must use configured HTTPS origin and deployment path, without query or fragment.', url)
        elif not target.is_file():
            finding('sitemap_page_missing', 'Sitemap URL has no local page.', url)
        else:
            label = target.relative_to(directory).as_posix()
            sitemap_labels.add(label)
            if label in ERROR_PAGES:
                finding('sitemap_error_page', '404 pages must stay outside sitemap.', url)
            if label not in documents:
                finding('sitemap_not_html', 'Sitemap URL must resolve to readable HTML.', url)
    robots_path = directory / 'robots.txt'
    try:
        robots = robots_path.read_text(encoding='utf-8')
        rules = wildcard_rules(robots)
        for url in locations or [site_url + '/']:
            if wildcard_blocked(url, rules):
                finding('robots_block', 'Wildcard robots rules block a sitemap URL; crawlers cannot reliably read its indexing directives.', url)
        for line in robots.splitlines():
            line = line.split('#', 1)[0].strip()
            if line.split(':', 1)[0].strip().lower() == 'sitemap':
                url = line.split(':', 1)[1].strip()
                if url != site_url + '/sitemap.xml':
                    finding('robots_sitemap_url', 'Robots Sitemap directive does not match configured sitemap URL.', 'robots.txt')
    except (OSError, UnicodeError) as error:
        finding('robots_missing', str(error), 'robots.txt')
    if base_path:
        finding('robots_not_host_root', 'Project robots.txt is below hostname root. This offline artifact cannot verify or control the host root robots.txt.', 'robots.txt', 'warning')

    parsed_nodes = {}
    for label, document in documents.items():
        parsed_nodes[label] = []
        if not document.schema_text:
            finding('schema_missing', 'Page has no JSON-LD.', label)
        for block in document.schema_text:
            try:
                value = json.loads(block)
                if not isinstance(value, (dict, list)) or not value:
                    raise ValueError('JSON-LD must contain an object or nonempty array')
                parsed_nodes[label].extend(nodes(value))
            except (ValueError, TypeError) as error:
                finding('schema_invalid', str(error), label)
    home_orgs = [node for node in parsed_nodes.get('index.html', []) if types(node) & ORGANIZATION_TYPES]
    primary = next((node for node in home_orgs if str(node.get('@id', '')).endswith('#business')), home_orgs[0] if home_orgs else {})
    identity = {key: primary.get(key) for key in ('@id', 'name', 'telephone')}
    if not all(isinstance(value, str) and value.strip() for value in identity.values()):
        finding('business_identity_missing', 'Homepage needs Organization or business subtype with @id, name and telephone to check identity consistency.', 'index.html')

    metadata = {'title': {}, 'description': {}}
    for label, document in documents.items():
        route = label[:-10] if label.endswith('index.html') else label
        expected = site_url + '/' + route
        if label == '404.html':
            expected = site_url + '/404/'
        if len(document.canonicals) != 1 or document.canonicals[0] != expected:
            finding('canonical_url', 'Expected one self canonical: ' + expected, label)
        directives = set(document.robots)
        if 'none' in directives:
            directives.update(('noindex', 'nofollow'))
        if mode == 'review' and 'noindex' not in directives:
            finding('review_noindex_missing', 'Every review HTML page must retain noindex.', label)
        if label in ERROR_PAGES and 'noindex' not in directives:
            finding('error_page_noindex_missing', '404 page must retain noindex.', label)
        if mode == 'production' and label in sitemap_labels:
            forbidden = directives & {'noindex', 'nofollow', 'nosnippet'}
            if forbidden:
                finding('production_robots', 'Sitemap page blocks production discovery or snippets: ' + ', '.join(sorted(forbidden)), label)
        if document.h1_count != 1:
            finding('h1_count', 'Expected exactly one H1; found ' + str(document.h1_count) + '.', label)
        title = compact(' '.join(document.title)) if document.title_count == 1 else ''
        description = compact(document.descriptions[0]) if len(document.descriptions) == 1 else ''
        for key, value in (('title', title), ('description', description)):
            if not value:
                finding(key + '_missing', 'Expected one nonempty ' + key + '.', label)
            elif label in sitemap_labels:
                metadata[key].setdefault(value.casefold(), []).append(label)
        body = compact(' '.join(document.text))
        name, phone = identity.get('name'), identity.get('telephone')
        if isinstance(name, str) and compact(name).casefold() not in body.casefold():
            finding('business_name_not_static', 'Business name is missing from visible static body text.', label)
        if isinstance(phone, str):
            digits = re.sub(r'\D', '', phone)
            variants = {digits, '0' + digits[2:]} if digits.startswith('61') else {digits}
            if digits and not any(variant in re.sub(r'\D', '', body) for variant in variants):
                finding('business_phone_not_static', 'Business telephone is missing from visible static body text.', label)
        for node in parsed_nodes[label]:
            node_types = types(node)
            if not node_types & ENTITY_TYPES:
                continue
            for key in ('@id', 'url'):
                value = node.get(key)
                if isinstance(value, str):
                    entity_target = local_path(value.split('#', 1)[0])
                    if entity_target is None or not entity_target.is_file():
                        finding('schema_entity_url', 'Business entity ' + key + ' uses a stale, external or missing local page URL: ' + value, label)
            if 'WebPage' in node_types:
                expected_metadata = {
                    'url': document.canonicals[0] if len(document.canonicals) == 1 else expected,
                    'name': title,
                    'description': description,
                }
                for key, expected_value in expected_metadata.items():
                    if not isinstance(node.get(key), str) or compact(node[key]) != expected_value:
                        finding('webpage_metadata', 'WebPage ' + key + ' must match page ' + {'url': 'canonical', 'name': 'title', 'description': 'meta description'}[key] + '.', label)
            if node_types & ORGANIZATION_TYPES:
                for key, expected_value in identity.items():
                    if expected_value and node.get(key) != expected_value:
                        finding('schema_identity', 'Organization ' + key + ' differs from homepage business identity.', label)
            for relation in ('provider', 'publisher', 'worksFor'):
                value = node.get(relation)
                if isinstance(value, dict) and value.get('@id') and identity.get('@id') and value['@id'] != identity['@id']:
                    finding('schema_identity', relation + ' does not reference homepage business @id.', label)
    for kind, values in metadata.items():
        for labels in values.values():
            if len(labels) > 1:
                finding('duplicate_' + kind, 'Sitemap pages share identical ' + kind + ': ' + ', '.join(labels))
    counts = Counter(item['severity'] for item in findings)
    return {
        'result': 'failed' if counts['error'] else 'passed', 'mode': mode,
        'site_url': site_url + '/', 'directory': str(directory),
        'scope': 'Offline artifact checks only. Does not measure live crawl access, indexing, rich result eligibility, rankings, AI citations or Core Web Vitals.',
        'metrics': {'html_files': len(documents), 'sitemap_urls': len(locations), 'errors': counts['error'], 'warnings': counts['warning']},
        'findings': findings,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', default=str(ROOT / 'dist'))
    parser.add_argument('--site-url', required=True)
    parser.add_argument('--mode', required=True, choices=('review', 'production'))
    args = parser.parse_args()
    try:
        report = audit(args.directory, args.site_url, args.mode)
    except (ValueError, OSError) as error:
        report = {'result': 'failed', 'findings': [{'severity': 'error', 'code': 'configuration', 'message': str(error)}]}
    print(json.dumps(report, indent=2))
    return int(report['result'] != 'passed')


if __name__ == '__main__':
    raise SystemExit(main())
