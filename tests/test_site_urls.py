"""Protect canonical identity through repeated business domain migrations."""
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('site_urls', ROOT / 'scripts/site_urls.py')
urls = importlib.util.module_from_spec(spec)
spec.loader.exec_module(urls)


class SiteOriginTests(unittest.TestCase):
    def test_origin_rejects_unsupported_or_unsafe_addresses(self):
        for value in ('http://example.com', 'https://user@example.com',
                      'https://example.com/repo', 'https://example.com/?x=1',
                      'https://example.com/#part', 'https://example..com',
                      'https://example.com:bad', 'https://example.com:0',
                      'https://example.com\"bad'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                urls.normalize_origin(value)
        self.assertEqual(urls.normalize_origin('https://EXAMPLE.com/'), 'https://example.com')

    def test_default_origin_follows_current_homepage(self):
        source = '<link href="https://approved.example/" rel="canonical">'
        self.assertEqual(urls.resolve_origin(source), ('https://approved.example', 'https://approved.example'))
        with self.assertRaises(ValueError):
            urls.resolve_origin(source + source)

    def test_repeated_migration_keeps_home_and_generated_metadata_together(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'scripts').mkdir()
            (root / 'dist').mkdir()
            for name in ('build-pages.py', 'site_urls.py', 'assembly-sources.json'):
                shutil.copy2(ROOT / 'scripts' / name, root / 'scripts' / name)
            for name in ('index.html', 'components.js'):
                shutil.copy2(ROOT / 'dist' / name, root / 'dist' / name)
            original = urls.HomeMetadata((root / 'dist/index.html').read_text()).canonicals[0].rstrip('/')
            previous = original
            for origin in ('https://first-approved.example', 'https://second-approved.example', None):
                env = dict(os.environ)
                env.pop('SITE_ORIGIN', None)
                if origin is not None:
                    env['SITE_ORIGIN'] = origin
                expected = origin or previous
                subprocess.run([sys.executable, str(root / 'scripts/build-pages.py')],
                               env=env, check=True, capture_output=True, text=True)
                for page in (root / 'dist').rglob('*.html'):
                    text = page.read_text()
                    metadata = urls.HomeMetadata(text)
                    self.assertTrue(metadata.canonicals[0].startswith(expected + '/'), page)
                    if previous != expected:
                        self.assertNotIn(previous, text)
                    self.assertNotIn(original, text)
                    graph = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', text).group(1))['@graph']
                    webpage = next(node for node in graph if node['@type'] == 'WebPage')
                    self.assertEqual(webpage['url'], metadata.canonicals[0])
                    self.assertEqual(webpage['name'], metadata.title)
                    self.assertEqual(webpage['description'], metadata.description)
                    self.assertEqual(webpage['about']['@id'], expected + '/#business')
                    self.assertEqual(webpage['isPartOf']['@id'], expected + '/#website')
                for file in ('robots.txt', 'sitemap.xml'):
                    text = (root / 'dist' / file).read_text()
                    self.assertIn(expected, text)
                    self.assertNotIn(original, text)
                    if previous != expected:
                        self.assertNotIn(previous, text)
                service = (root / 'dist/services/truck-servicing/index.html').read_text()
                graph = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', service).group(1))['@graph']
                breadcrumb = next(node for node in graph if node['@type'] == 'BreadcrumbList')
                self.assertEqual([item['name'] for item in breadcrumb['itemListElement']], ['Home', 'Services', 'Truck servicing'])
                previous = expected


if __name__ == '__main__':
    unittest.main()
