"""Check the production artifact through Cloudflare's local Pages runtime.

Requires ``npm ci`` and ``python3 scripts/prepare-launch.py`` first. This script
starts a loopback-only emulator, makes no deployment, and needs no account token.
"""
from contextlib import contextmanager
from html.parser import HTMLParser
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import HTTPRedirectHandler, build_opener
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://sampsonheavydiesel.com'
HOST = '127.0.0.1'
PORT = 4178
BASE = f'http://{HOST}:{PORT}'


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


class Metadata(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.canonical = None
        self.robots = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')
        if tag == 'meta' and attrs.get('name', '').lower() == 'robots':
            self.robots = attrs.get('content', '').lower()


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def request(path, timeout=10):
    opener = build_opener(NoRedirect())
    try:
        response = opener.open(BASE + path, timeout=timeout)
    except HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read().decode('utf-8')


def stop(process):
    """Stop Wrangler and its workerd child, including on assertion failure."""
    if process is None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)


@contextmanager
def local_pages():
    wrangler = ROOT / 'node_modules/.bin/wrangler'
    require(wrangler.exists(), 'Wrangler is missing. Run npm ci first.')
    require((ROOT / '_production/index.html').exists(),
            'Production artifact is missing. Run python3 scripts/prepare-launch.py first.')
    with socket.socket() as port_check:
        # A completed check can leave TCP TIME_WAIT entries without a listener.
        port_check.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            port_check.bind((HOST, PORT))
        except OSError as error:
            raise RuntimeError(f'Port {PORT} is already in use; stop its server first.') from error
    environment = os.environ.copy()
    environment.update({'WRANGLER_SEND_METRICS': 'false', 'CI': 'true'})
    # The local emulator does not need credentials; never pass account tokens to it.
    for key in ('CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL',
                'CLOUDFLARE_ACCOUNT_ID', 'CF_API_TOKEN', 'CF_API_KEY', 'CF_EMAIL'):
        environment.pop(key, None)
    process = None
    with tempfile.TemporaryFile(mode='w+t') as log, tempfile.TemporaryDirectory(
            prefix='sampson-pages-smoke-') as state:
        try:
            process = subprocess.Popen(
                [str(wrangler), 'pages', 'dev', '_production', '--ip', HOST,
                 '--port', str(PORT), '--inspector-port', '0', '--persist-to', state,
                 '--no-show-interactive-dev-session'],
                cwd=ROOT, env=environment, stdout=log, stderr=subprocess.STDOUT,
                start_new_session=True,
            )
            deadline = time.monotonic() + 45
            while time.monotonic() < deadline:
                require(process.poll() is None, 'Cloudflare Pages emulator exited before readiness.')
                try:
                    if request('/', timeout=1)[0] == 200:
                        break
                except (URLError, TimeoutError, ConnectionError):
                    pass
                time.sleep(0.25)
            else:
                raise RuntimeError('Cloudflare Pages emulator did not become ready within 45 seconds.')
            yield
        except Exception:
            log.flush()
            log.seek(0)
            lines = log.read().splitlines()[-100:]
            if lines:
                print('\nCloudflare local runtime output:\n' + '\n'.join(lines), file=sys.stderr)
            raise
        finally:
            stop(process)


def check_pages():
    status, headers, body = request('/')
    require(status == 200, f'Homepage returned {status}, expected 200.')
    metadata = Metadata(body)
    require(metadata.canonical == ORIGIN + '/', 'Homepage canonical uses the wrong production domain.')
    require(metadata.robots and 'index' in metadata.robots.split(', ')
            and 'noindex' not in metadata.robots, 'Homepage must allow production indexing.')
    require('noindex' not in headers.get('X-Robots-Tag', '').lower(),
            'Local production homepage unexpectedly has a noindex response header.')

    status, headers, _ = request('/services/truck-servicing')
    require(status in (301, 308), f'Service URL without trailing slash returned {status}, expected permanent redirect.')
    target = urljoin(BASE + '/services/truck-servicing', headers.get('Location', ''))
    require(target == BASE + '/services/truck-servicing/', f'Incorrect service redirect: {target}')
    status, _, body = request('/services/truck-servicing/')
    require(status == 200, f'Service page returned {status}, expected 200.')
    require(Metadata(body).canonical == ORIGIN + '/services/truck-servicing/',
            'Service canonical does not match its public production URL.')

    for path in ('/missing-pages-smoke-check/', '/assets/clive-sampson.webp',
                 '/assets/clive-sampson-profile.webp'):
        status, _, body = request(path)
        require(status == 404, f'{path} returned {status}; missing pages and removed portraits must return 404.')
        require('noindex' in (Metadata(body).robots or ''), f'{path} must serve the noindex 404 document.')

    status, _, robots = request('/robots.txt')
    require(status == 200, f'robots.txt returned {status}, expected 200.')
    require(f'Sitemap: {ORIGIN}/sitemap.xml' in robots, 'robots.txt sitemap uses the wrong domain.')
    require('Allow: /' in robots and 'Disallow: /' not in robots,
            'Production robots.txt must allow public search crawling.')

    status, _, sitemap = request('/sitemap.xml')
    require(status == 200, f'Sitemap returned {status}, expected 200.')
    locations = [node.text for node in ET.fromstring(sitemap).findall(
        '{http://www.sitemaps.org/schemas/sitemap/0.9}url/'
        '{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    require(len(locations) >= 13 and all(url and url.startswith(ORIGIN + '/') for url in locations),
            'Sitemap is incomplete or contains a nonproduction URL.')

    for path in ('/', '/style.css'):
        status, headers, _ = request(path)
        require(status == 200, f'{path} returned {status}, expected 200.')
        require(headers.get('X-Content-Type-Options', '').lower() == 'nosniff',
                f'{path} is missing X-Content-Type-Options: nosniff.')
        csp = headers.get('Content-Security-Policy', '')
        require("default-src 'self'" in csp and "frame-ancestors 'none'" in csp
                and "object-src 'none'" in csp and "'unsafe-inline'" not in csp,
                f'{path} is missing the expected Content Security Policy.')
    # HSTS targets the custom HTTPS hostname and cannot be asserted on loopback HTTP.
    print('Cloudflare Pages local smoke check passed: routes, canonical URLs, indexing, sitemap, security headers and removed portraits.')


def main():
    try:
        with local_pages():
            check_pages()
    except (RuntimeError, OSError, URLError, ET.ParseError) as error:
        print(f'Cloudflare Pages local smoke check failed: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
