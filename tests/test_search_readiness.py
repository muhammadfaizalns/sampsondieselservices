"""Search checks must distinguish review protection from an indexable launch."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('search_readiness', ROOT / 'scripts/audit-search-readiness.py')
search = importlib.util.module_from_spec(spec)
spec.loader.exec_module(search)


class SearchReadinessTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.origin = 'https://business.example'

    def page(self, route='', robots='', title=None, description=None, schema_origin=None, body=None, webpage=False):
        schema_origin = schema_origin or self.origin
        url = self.origin + '/' + route
        schema = {'@context': 'https://schema.org', '@graph': [
            {'@type': 'Organization', '@id': schema_origin + '/#business', 'name': 'Sampson Heavy Diesel Services', 'telephone': '+61474372852', 'url': schema_origin + '/'},
            {'@type': 'WebSite', '@id': schema_origin + '/#website', 'url': schema_origin + '/', 'publisher': {'@id': schema_origin + '/#business'}},
            {'@type': 'Person', '@id': schema_origin + '/#clive', 'url': schema_origin + '/#profile', 'worksFor': {'@id': schema_origin + '/#business'}},
        ]}
        if route not in ('', '404/'):
            schema['@graph'].append({'@type': 'Service', '@id': schema_origin + '/' + route + '#service', 'url': schema_origin + '/' + route, 'provider': {'@id': schema_origin + '/#business'}})
        if webpage:
            schema['@graph'].append({'@type': 'WebPage', '@id': schema_origin + '/' + route + '#webpage', 'url': schema_origin + '/' + route, 'name': title or 'Page ' + (route or 'home'), 'description': description or 'Description ' + (route or 'home')})
        text = '<!doctype html><html><head><title>' + (title or 'Page ' + (route or 'home')) + '</title><meta name="description" content="' + (description or 'Description ' + (route or 'home')) + '"><link rel="canonical" href="' + url + '">'
        if robots:
            text += '<meta name="robots" content="' + robots + '">'
        text += '<script type="application/ld+json">\n' + json.dumps(schema, indent=2) + '\n</script></head><body>'
        text += body if body is not None else '<h1>Service information</h1><p>Sampson Heavy Diesel Services. Call 0474 372 852.</p>'
        text += '</body></html>'
        path = self.directory / route / 'index.html'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        return path

    def fixture(self, review=False):
        robots = 'noindex, nofollow, noarchive' if review else ''
        self.page(robots=robots)
        self.page('services/engine/', robots=robots)
        self.page('404/', robots='noindex')
        (self.directory / '404.html').write_text((self.directory / '404/index.html').read_text())
        (self.directory / 'sitemap.xml').write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join('<url><loc>' + self.origin + '/' + route + '</loc></url>' for route in ('', 'services/engine/')) + '</urlset>')
        (self.directory / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: ' + self.origin + '/sitemap.xml\n')

    def report(self, mode='production'):
        return search.audit(self.directory, self.origin, mode)

    def codes(self, report):
        return {item['code'] for item in report['findings']}

    def replace(self, relative, old, new):
        path = self.directory / relative
        path.write_text(path.read_text().replace(old, new))

    def test_valid_production_with_noindex_404_excluded(self):
        self.fixture()
        report = self.report()
        self.assertEqual(report['result'], 'passed', report)
        self.assertEqual(report['metrics']['html_files'], 4)
        self.assertEqual(report['metrics']['sitemap_urls'], 2)

    def test_review_noindex_passes_but_same_artifact_fails_production(self):
        self.fixture(review=True)
        self.assertEqual(self.report('review')['result'], 'passed')
        self.assertIn('production_robots', self.codes(self.report()))

    def test_review_requires_noindex_on_every_html(self):
        self.fixture(review=True)
        self.replace('services/engine/index.html', 'noindex, nofollow, noarchive', 'index')
        self.assertIn('review_noindex_missing', self.codes(self.report('review')))

    def test_error_page_must_stay_noindex_and_outside_sitemap(self):
        self.fixture()
        self.replace('sitemap.xml', '</urlset>', '<url><loc>' + self.origin + '/404/</loc></url></urlset>')
        self.replace('404/index.html', '<meta name="robots" content="noindex">', '')
        codes = self.codes(self.report())
        self.assertIn('sitemap_error_page', codes)
        self.assertIn('error_page_noindex_missing', codes)

    def test_stale_canonical_fails(self):
        self.fixture()
        self.replace('index.html', 'rel="canonical" href="https://business.example/', 'rel="canonical" href="https://old.example/')
        self.assertIn('canonical_url', self.codes(self.report()))

    def test_stale_entity_urls_and_identity_fail(self):
        self.fixture()
        self.page('services/engine/', schema_origin='https://old.example')
        codes = self.codes(self.report())
        self.assertIn('schema_entity_url', codes)
        self.assertIn('schema_identity', codes)

    def test_same_origin_entity_missing_page_is_stale(self):
        self.fixture()
        self.replace('services/engine/index.html', '"url": "https://business.example/services/engine/"', '"url": "https://business.example/removed-service/"')
        self.assertIn('schema_entity_url', self.codes(self.report()))

    def test_webpage_metadata_matches_canonical_title_and_description(self):
        self.fixture()
        self.page('services/engine/', webpage=True)
        self.assertEqual(self.report()['result'], 'passed')

    def test_stale_webpage_url_fails(self):
        self.fixture()
        self.page('services/engine/', webpage=True)
        self.replace('services/engine/index.html', '"@type": "WebPage",\n      "@id": "https://business.example/services/engine/#webpage",\n      "url": "https://business.example/services/engine/"', '"@type": "WebPage",\n      "@id": "https://business.example/services/engine/#webpage",\n      "url": "https://old.example/services/engine/"')
        codes = self.codes(self.report())
        self.assertIn('schema_entity_url', codes)
        self.assertIn('webpage_metadata', codes)

    def test_webpage_title_and_description_mismatch_fail(self):
        self.fixture()
        self.page('services/engine/', webpage=True)
        self.replace('services/engine/index.html', '"name": "Page services/engine/"', '"name": "Old service title"')
        self.replace('services/engine/index.html', '"description": "Description services/engine/"', '"description": "Old service description"')
        errors = [item for item in self.report()['findings'] if item['code'] == 'webpage_metadata']
        self.assertTrue(any('name' in item['message'] for item in errors), errors)
        self.assertTrue(any('description' in item['message'] for item in errors), errors)

    def test_changed_business_name_and_provider_reference_fail(self):
        self.fixture()
        self.replace('services/engine/index.html', '"name": "Sampson Heavy Diesel Services"', '"name": "Different Business"')
        self.replace('services/engine/index.html', '"provider": {\n        "@id": "https://business.example/#business"', '"provider": {\n        "@id": "https://business.example/#unrelated"')
        errors = [item for item in self.report()['findings'] if item['code'] == 'schema_identity']
        self.assertTrue(any('name' in item['message'] for item in errors), errors)
        self.assertTrue(any('provider' in item['message'] for item in errors), errors)

    def test_stale_sitemap_and_robots_sitemap_fail(self):
        self.fixture()
        self.replace('sitemap.xml', self.origin, 'https://old.example')
        self.replace('robots.txt', self.origin, 'https://old.example')
        codes = self.codes(self.report())
        self.assertIn('sitemap_url', codes)
        self.assertIn('robots_sitemap_url', codes)

    def test_missing_sitemap_page_fails(self):
        self.fixture()
        (self.directory / 'services/engine/index.html').unlink()
        self.assertIn('sitemap_page_missing', self.codes(self.report()))

    def test_duplicate_metadata_fails(self):
        self.fixture()
        self.page('services/engine/', title='Page home', description='Description home')
        codes = self.codes(self.report())
        self.assertIn('duplicate_title', codes)
        self.assertIn('duplicate_description', codes)

    def test_nested_project_paths_pass_with_root_robots_warning(self):
        self.origin += '/team/review'
        self.fixture(review=True)
        report = self.report('review')
        self.assertEqual(report['result'], 'passed', report)
        self.assertIn('robots_not_host_root', self.codes(report))

    def test_project_path_boundary_cannot_escape(self):
        self.origin += '/review'
        self.fixture(review=True)
        self.replace('sitemap.xml', '/review/services/', '/review-elsewhere/services/')
        self.assertIn('sitemap_url', self.codes(self.report('review')))

    def test_wildcard_block_fails_but_specific_allow_exception_works(self):
        self.fixture()
        (self.directory / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
        self.assertIn('robots_block', self.codes(self.report()))
        self.origin += '/review'
        self.fixture(review=True)
        (self.directory / 'robots.txt').write_text('User-agent: *\nDisallow: /\nAllow: /review/\n')
        self.assertNotIn('robots_block', self.codes(self.report('review')))

    def test_invalid_jsonld_and_missing_static_facts_fail(self):
        self.fixture()
        self.page('services/engine/', body='<h2>Nothing here</h2><script>Sampson Heavy Diesel Services 0474 372 852</script>')
        self.replace('services/engine/index.html', '"@context": "https://schema.org",', '"@context": ,')
        codes = self.codes(self.report())
        self.assertTrue({'schema_invalid', 'h1_count', 'business_name_not_static', 'business_phone_not_static'} <= codes)

    def test_nosnippet_and_none_are_launch_blocks(self):
        self.fixture()
        self.page('services/engine/', robots='nosnippet')
        self.assertIn('production_robots', self.codes(self.report()))
        self.page('services/engine/', robots='none')
        self.assertIn('production_robots', self.codes(self.report()))

    def test_cli_emits_json_and_nonzero_exit_for_failed_launch(self):
        self.fixture(review=True)
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/audit-search-readiness.py'), '--directory', str(self.directory), '--site-url', self.origin, '--mode', 'production'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(json.loads(result.stdout)['result'], 'failed')


if __name__ == '__main__':
    unittest.main()
