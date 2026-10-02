"""Regression checks for the Pages subfolder build and review indexing policy."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pages_build', ROOT / 'scripts/build-github-pages.py')
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


def fingerprint(directory):
    return {str(p.relative_to(directory)): hashlib.sha256(p.read_bytes()).hexdigest() for p in directory.rglob('*') if p.is_file()}


class PagesBuildTests(unittest.TestCase):
    def test_project_urls_and_existing_robots(self):
        source = '<head><meta name="robots" content="index"></head><a href="/">Home</a><a href="/#clive">Clive</a><img src="/assets/logo.webp"><a href="//elsewhere.example/x">External</a><a href="tel:+61474372852">Call</a>'
        rendered = pages.rewrite_html(source, 'https://old.example', 'https://new.example/repo', '/repo')
        self.assertIn('href="/repo/"', rendered)
        self.assertIn('href="/repo/#clive"', rendered)
        self.assertIn('src="/repo/assets/logo.webp"', rendered)
        self.assertIn('href="//elsewhere.example/x"', rendered)
        self.assertIn('href="tel:+61474372852"', rendered)
        self.assertEqual(rendered.count('name="robots"'), 1)
        self.assertIn('noindex, nofollow, noarchive', rendered)

    def test_full_build_does_not_change_source_and_can_rebuild(self):
        source = ROOT / 'dist'
        before = fingerprint(source)
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / 'review'
            result = pages.build(source, output, 'https://muhammadfaizalns.github.io/sampsondieselservices/')
            self.assertEqual(result['html_files'], 13)
            self.assertEqual(result['models'], 10)
            self.assertIn('`/sampsondieselservices/assets/models/${components[index].file}.glb`', (output / 'gearbox.js').read_text())
            self.assertIn("'./components.js'", (output / 'gearbox.js').read_text())
            self.assertIn('/sampsondieselservices/assets/fonts/', (output / 'assets/fonts/fonts.css').read_text())
            (output / 'stale.html').write_text('stale')
            pages.build(source, output, 'https://review.example/')
            self.assertFalse((output / 'stale.html').exists())
            self.assertIn('href="https://review.example/"', (output / 'index.html').read_text())
        self.assertEqual(before, fingerprint(source))

    def test_refuses_unmanaged_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            (output / 'keep.txt').write_text('keep')
            with self.assertRaisesRegex(ValueError, 'Refusing to overwrite'):
                pages.build(ROOT / 'dist', output, 'https://review.example')
            self.assertEqual((output / 'keep.txt').read_text(), 'keep')


if __name__ == '__main__':
    unittest.main()
