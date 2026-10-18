"""Resolve one canonical origin for generated business pages."""
from html.parser import HTMLParser
import re
from urllib.parse import urlsplit, urlunsplit


def normalize_origin(value):
    parsed = urlsplit(value)
    try:
        port = parsed.port
    except ValueError as error:
        raise ValueError('SITE_ORIGIN has an invalid port.') from error
    if (parsed.scheme != 'https' or not parsed.hostname
            or parsed.username is not None or parsed.password is not None
            or parsed.path not in ('', '/') or parsed.query or parsed.fragment
            or not re.fullmatch(r'[A-Za-z0-9.-]+', parsed.hostname)
            or any(not label for label in parsed.hostname.split('.'))
            or port == 0):
        raise ValueError('SITE_ORIGIN must be an HTTPS origin without credentials, path, query or fragment.')
    return urlunsplit(('https', parsed.netloc.lower(), '', '', ''))


class HomeMetadata(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.canonicals = []
        self.title = ''
        self.description = ''
        self.in_title = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href', ''))
        if tag == 'title':
            self.in_title = True
        if tag == 'meta' and attrs.get('name') == 'description':
            self.description = attrs.get('content', '')

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def resolve_origin(source, requested=None):
    metadata = HomeMetadata(source)
    if len(metadata.canonicals) != 1:
        raise ValueError('Homepage must have exactly one root canonical URL.')
    previous = normalize_origin(metadata.canonicals[0])
    return previous, normalize_origin(requested) if requested is not None else previous
