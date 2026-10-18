"""Regression checks for isolated production builds, public assets and launch policy."""
import hashlib
import html
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('production_build', ROOT / 'scripts/build-production.py')
production = importlib.util.module_from_spec(spec)
spec.loader.exec_module(production)
OLD = 'https://source.example'
NEW = 'https://sampsonheavydiesel.com'
PRIVACY = ('<h1>Privacy</h1><p>Cloudflare Web Analytics information.</p>'
           '{{GOOGLE_ANALYTICS_NOTICE}}{{CLARITY_NOTICE}}')
GOOGLE_NOTICE = '<h2>Google Analytics</h2><p>Optional Google Analytics runs after consent.</p>'
CLARITY_NOTICE = '<h2>Microsoft Clarity</h2><p>Optional session replay runs after separate consent.</p>'


def fingerprint(directory):
    return {str(path.relative_to(directory)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in directory.rglob('*') if path.is_file()}


def fixture(directory):
    source = directory / 'source'
    source.mkdir()
    routes = {'index.html': '/', 'services/index.html': '/services/',
              'privacy/index.html': '/privacy/', '404.html': '/404/', '404/index.html': '/404/'}
    for name, route in routes.items():
        path = source / name
        path.parent.mkdir(parents=True, exist_ok=True)
        schema = json.dumps({'@context': 'https://schema.org', 'url': OLD + route})
        path.write_text(f'''<!doctype html><html><head><title>Test</title>
<link rel="canonical" href="{OLD + route}"><meta property="og:url" content="{OLD + route}">
<meta property="og:image" content="{OLD}/assets/sampson-equipment-logo.png">
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="/style.css"><script type="application/ld+json">{schema}</script>
</head><body><a href="/services/">Services</a><div class="wrap legal-prose"><h1>Old privacy notice</h1></div></section>
<img src="/assets/sampson-equipment-logo.webp"><img src="/assets/complete-engine-poster.webp"></body></html>''')
    (source / 'sitemap.xml').write_text(
        '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + ''.join(f'<url><loc>{OLD + route}</loc></url>' for route in ('/', '/services/', '/privacy/'))
        + '</urlset>')
    (source / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
    (source / 'style.css').write_text('body { color: black; }')
    (source / 'analytics.css').write_text('.analytics-dialog { display: block; }')
    (source / 'analytics.js').write_text('// Consent module fixture.\n')
    (source / 'components.js').write_text('export const components = ' + json.dumps([
        {'file': 'diesel-engine-assembly'}, {'file': 'transmission-assembly'}]) + ';')
    assets = source / 'assets'
    models = assets / 'models'
    models.mkdir(parents=True)
    for name in ('sampson-equipment-logo.webp', 'sampson-equipment-logo.png',
                 'complete-engine-poster.webp', 'truck.webp', 'clive-sampson.webp',
                 'clive-sampson-profile.webp', 'sampson-logo.png', 'sampson-logo-vehicles.webp',
                 'engine-poster.webp', 'gearbox-poster.webp', 'gear-geometry.js', 'logo.svg', 'monogram.png'):
        (assets / name).write_bytes(b'asset')
    for name in ('diesel-engine-assembly.glb', 'transmission-assembly.glb', 'obsolete.glb',
                 'LICENSE.txt', 'obsolete-LICENSE.txt'):
        (models / name).write_bytes(b'model or retained licence')
    (source / '.env').write_text('SENSITIVE=not-public')
    (source / 'wrangler.jsonc').write_text('{}')
    (source / 'credentials.json').write_text('{}')
    (source / 'package.json').write_text('{}')
    (source / 'source.py').write_text('print("not static")')
    hidden = source / '.git'
    hidden.mkdir()
    (hidden / 'config').write_text('not-public')
    (source / '_redirects').write_text('/* https://bad.example 301')
    (source / '_headers').write_text('/*\n  X-Bad: source')
    (assets / 'linked.json').symlink_to(source / 'credentials.json')
    return source


class ProductionBuildTests(unittest.TestCase):
    def build(self, source, output, **kwargs):
        return production.build(source, output, privacy_template=PRIVACY,
                                google_privacy_template=GOOGLE_NOTICE,
                                clarity_privacy_template=CLARITY_NOTICE, **kwargs)

    def test_domain_indexing_sitemap_and_source_immutability(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = fixture(directory)
            before = fingerprint(source)
            output = directory / 'production'
            result = self.build(source, output)
            self.assertEqual(before, fingerprint(source))
            self.assertEqual(result['site_url'], NEW)
            self.assertEqual(result['html_files'], 5)
            self.assertEqual(result['sitemap_pages'], 3)
            self.assertEqual(result['models'], 2)
            for path in output.rglob('*.html'):
                content = path.read_text()
                self.assertNotIn(OLD, content)
                self.assertIn(NEW, content)
                document = production.Document(content)
                self.assertEqual(len(document.robots), 1)
                self.assertEqual('noindex' in document.robots[0], path.name == '404.html' or path.parent.name == '404')
            self.assertEqual((output / 'robots.txt').read_text(),
                             f'User-agent: *\nAllow: /\nSitemap: {NEW}/sitemap.xml\n')
            self.assertNotIn('/404/', (output / 'sitemap.xml').read_text())
            self.assertIn('Google Analytics is not enabled', (output / 'privacy/index.html').read_text())
            self.assertIn('Microsoft Clarity session replay is not enabled', (output / 'privacy/index.html').read_text())
            self.assertNotIn('Old privacy notice', (output / 'privacy/index.html').read_text())
            self.assertNotIn('/analytics.js', (output / 'index.html').read_text())

    def test_prunes_personal_unused_and_nonpublic_files_but_retains_licences(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = fixture(directory)
            output = directory / 'production'
            self.build(source, output)
            for name in ('clive-sampson.webp', 'clive-sampson-profile.webp', 'sampson-logo.png',
                         'sampson-logo-vehicles.webp', 'engine-poster.webp', 'gearbox-poster.webp',
                         'gear-geometry.js', 'logo.svg', 'monogram.png', 'linked.json'):
                self.assertFalse((output / 'assets' / name).exists(), name)
            for name in ('.env', '.git', 'wrangler.jsonc', 'credentials.json', 'package.json', 'source.py', '_redirects'):
                self.assertFalse((output / name).exists(), name)
            self.assertFalse((output / 'assets/models/obsolete.glb').exists())
            self.assertTrue((output / 'assets/models/obsolete-LICENSE.txt').is_file())
            self.assertTrue((output / 'assets/models/LICENSE.txt').is_file())
            self.assertTrue((output / 'assets/models/diesel-engine-assembly.glb').is_file())
            self.assertTrue((output / 'assets/complete-engine-poster.webp').is_file())
            self.assertTrue((output / 'assets/sampson-equipment-logo.webp').is_file())
            self.assertNotIn('X-Bad', (output / '_headers').read_text())

    def test_only_managed_separate_outputs_can_be_rebuilt(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = fixture(directory)
            output = directory / 'production'
            output.mkdir()
            (output / 'keep.txt').write_text('keep')
            with self.assertRaisesRegex(ValueError, 'Refusing to overwrite'):
                self.build(source, output)
            self.assertEqual((output / 'keep.txt').read_text(), 'keep')
            for unsafe in (source, source / 'nested', directory):
                with self.assertRaisesRegex(ValueError, 'separate'):
                    self.build(source, unsafe)
            (output / 'keep.txt').unlink()
            output.rmdir()
            self.build(source, output)
            (output / 'stale.html').write_text('stale')
            self.build(source, output)
            self.assertFalse((output / 'stale.html').exists())

    def test_rejects_invalid_origins_and_measurement_ids_before_mutation(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = fixture(directory)
            output = directory / 'production'
            for origin in ('http://bad.example', NEW + '/project', 'https://user:password@bad.example', NEW + '?query=1'):
                with self.subTest(origin=origin), self.assertRaises(ValueError):
                    self.build(source, output, site_url=origin)
                self.assertFalse(output.exists())
            for measurement in ('G-1234', 'G-abcdefghij', 'G-ABCDEFGHIJ\" onload=\"bad', 'UA-1234567890', ' G-ABCDEFGHIJ'):
                with self.subTest(measurement=measurement), self.assertRaises(ValueError):
                    self.build(source, output, measurement_id=measurement)
                self.assertFalse(output.exists())
            for clarity in ('project/id', 'UPPER12345', 'abc def', 'abc\" onload=\"bad',
                            'abc?query', 'abc#fragment', 'abc\n', 'a' * 65, 123, False):
                with self.subTest(clarity=clarity), self.assertRaises(ValueError):
                    self.build(source, output, clarity_id=clarity)
                self.assertFalse(output.exists())
            self.build(source, output, measurement_id='G-ABCDEF1234', clarity_id='valid123')
            before = fingerprint(output)
            for settings in ({'measurement_id': 'G-invalid', 'clarity_id': 'valid123'},
                             {'measurement_id': 'G-ABCDEF1234', 'clarity_id': 'bad/id'}):
                with self.subTest(settings=settings), self.assertRaises(ValueError):
                    self.build(source, output, **settings)
                self.assertEqual(fingerprint(output), before)

    def test_configured_ga4_injects_external_consent_module_and_matching_notice(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = fixture(directory)
            output = directory / 'production'
            result = self.build(source, output, measurement_id='G-ABCDEF1234')
            self.assertEqual(result['ga4'], 'configured with consent required')
            for path in output.rglob('*.html'):
                content = path.read_text()
                self.assertEqual(content.count('src="/analytics.js?v=3"'), 1)
                self.assertIn('data-ga4-id="G-ABCDEF1234"', content)
                self.assertIn('data-host="sampsonheavydiesel.com"', content)
                self.assertIn('href="/analytics.css?v=3"', content)
                self.assertNotIn('gtag(', content)
            self.assertIn(GOOGLE_NOTICE, (output / 'privacy/index.html').read_text())
            (source / 'analytics.js').unlink()
            with self.assertRaisesRegex(ValueError, 'requires analytics.js'):
                self.build(source, output, measurement_id='G-ABCDEF1234')

    def test_all_provider_combinations_have_independent_attributes_notices_and_csp(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = fixture(directory)
            for ga4, clarity in ((None, None), ('G-ABCDEF1234', None),
                                 (None, 'abcde12345'), ('G-ABCDEF1234', 'abcde12345')):
                with self.subTest(ga4=ga4, clarity=clarity):
                    output = directory / 'production'
                    result = self.build(source, output, measurement_id=ga4, clarity_id=clarity)
                    self.assertEqual(result['ga4'] != 'disabled', bool(ga4))
                    self.assertEqual(result['clarity'] != 'disabled', bool(clarity))
                    for path in output.rglob('*.html'):
                        content = path.read_text()
                        self.assertEqual(content.count('src="/analytics.js?v=3"'), int(bool(ga4 or clarity)))
                        self.assertEqual(content.count('href="/analytics.css?v=3"'), int(bool(ga4 or clarity)))
                        self.assertEqual('data-ga4-id=' in content, bool(ga4))
                        self.assertEqual('data-clarity-id=' in content, bool(clarity))
                        self.assertEqual('data-public-paths=' in content, bool(clarity))
                        if clarity:
                            encoded = html.escape(json.dumps(['/', '/privacy/', '/services/'],
                                                             separators=(',', ':')), quote=True)
                            self.assertIn(f'data-public-paths="{encoded}"', content)
                        if ga4 or clarity:
                            self.assertIn('data-host="sampsonheavydiesel.com"', content)
                        self.assertNotIn('src="https://www.clarity.ms/', content)
                    privacy = (output / 'privacy/index.html').read_text()
                    self.assertEqual(GOOGLE_NOTICE in privacy, bool(ga4))
                    self.assertEqual(CLARITY_NOTICE in privacy, bool(clarity))
                    self.assertEqual('Google Analytics is not enabled' in privacy, not bool(ga4))
                    self.assertEqual('Microsoft Clarity session replay is not enabled' in privacy, not bool(clarity))
                    self.assertNotIn('{{', privacy)
                    headers = (output / '_headers').read_text()
                    self.assertEqual('https://www.clarity.ms' in headers, bool(clarity))
                    self.assertEqual('https://c.bing.com' in headers, bool(clarity))

    def test_clarity_only_requires_consent_assets_before_replacing_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = fixture(directory)
            output = directory / 'production'
            self.build(source, output)
            before = fingerprint(output)
            for name in ('analytics.js', 'analytics.css'):
                path = source / name
                content = path.read_text()
                path.unlink()
                with self.subTest(asset=name), self.assertRaisesRegex(ValueError, 'requires analytics.js'):
                    self.build(source, output, clarity_id='abcde12345')
                self.assertEqual(fingerprint(output), before)
                path.write_text(content)

    def test_privacy_requires_exactly_one_placeholder_per_provider_before_mutation(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = fixture(directory)
            output = directory / 'production'
            for template in ('{{GOOGLE_ANALYTICS_NOTICE}}', '{{CLARITY_NOTICE}}',
                             PRIVACY + '{{CLARITY_NOTICE}}', PRIVACY + '{{GOOGLE_ANALYTICS_NOTICE}}'):
                with self.subTest(template=template), self.assertRaisesRegex(ValueError, 'placeholder'):
                    production.build(source, output, privacy_template=template)
                self.assertFalse(output.exists())

    def test_clarity_csp_is_limited_to_provider_roles(self):
        headers = production.security_headers(NEW, clarity_enabled=True)
        csp = headers.split('Content-Security-Policy: ', 1)[1].split('\n', 1)[0]
        directives = {part.split(' ', 1)[0]: part.partition(' ')[2]
                      for part in csp.split('; ')}
        self.assertIn('https://www.clarity.ms', directives['script-src'])
        self.assertIn('https://scripts.clarity.ms', directives['script-src'])
        self.assertNotIn('https://*.clarity.ms', directives['script-src'])
        self.assertNotIn('https://c.bing.com', directives['script-src'])
        self.assertIn('https://*.clarity.ms', directives['connect-src'])
        self.assertNotIn('https://c.bing.com', directives['connect-src'])
        self.assertIn('https://*.clarity.ms', directives['img-src'])
        self.assertIn('https://c.bing.com', directives['img-src'])
        self.assertEqual(directives['default-src'], "'self'")
        self.assertNotIn("'unsafe-inline'", headers)
        self.assertNotIn("'unsafe-eval'", headers)
        self.assertTrue(all(len(line) <= 2000 for line in headers.splitlines()))

    def test_replay_paths_reject_unsafe_or_unpublished_sitemap_urls_before_mutation(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            source = fixture(directory)
            output = directory / 'production'
            path = source / 'sitemap.xml'
            sitemap = path.read_text()
            for location in (OLD + '/?name=private', OLD + '/#private',
                             'https://other.example/', OLD + '/unknown/', OLD + '/404/'):
                path.write_text(sitemap.replace(OLD + '/</loc>', location + '</loc>', 1))
                with self.subTest(location=location), self.assertRaisesRegex(ValueError, 'Sitemap'):
                    self.build(source, output, clarity_id='valid123')
                self.assertFalse(output.exists())

    def test_security_policy_keeps_gallery_and_provider_endpoints_without_broad_execution(self):
        headers = production.security_headers(NEW)
        self.assertIn("script-src 'self' 'wasm-unsafe-eval'", headers)
        self.assertNotIn("'unsafe-eval'", headers)
        self.assertNotIn("'unsafe-inline'", headers)
        self.assertIn("style-src-attr 'none'", headers)
        self.assertIn("img-src 'self' data: blob:", headers)
        self.assertIn("connect-src 'self' blob:", headers)
        self.assertIn("worker-src 'none'", headers)
        self.assertIn('https://static.cloudflareinsights.com', headers)
        self.assertIn('https://*.google-analytics.com', headers)
        self.assertIn('! Cache-Control\n  Cache-Control: public, max-age=86400', headers)
        self.assertNotIn('immutable', headers)
        self.assertIn(NEW + '/*\n  Strict-Transport-Security: max-age=86400', headers)
        self.assertNotIn('includeSubDomains', headers)
        self.assertNotIn('preload', headers)
        self.assertIn('https://:worker.:account.workers.dev/*\n  X-Robots-Tag: noindex', headers)
        self.assertIn('https://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex', headers)
        self.assertTrue(all(len(line) <= 2000 for line in headers.splitlines()))


if __name__ == '__main__':
    unittest.main()
