"""Independent public analytics defaults, explicit overrides and preview isolation."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('prepare_launch', ROOT / 'scripts/prepare-launch.py')
launch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launch)
spec = importlib.util.spec_from_file_location('production_build', ROOT / 'scripts/build-production.py')
production = importlib.util.module_from_spec(spec)
spec.loader.exec_module(production)
MEASUREMENT_ID = 'G-ABCDEF1234'
CLARITY_ID = 'abcde12345'


class PrepareLaunchTests(unittest.TestCase):
    def config(self, directory, value):
        path = directory / 'public-production.json'
        path.write_text(json.dumps(value))
        return path

    def test_main_and_local_builds_receive_public_fallback_without_mutating_environment(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = self.config(Path(temporary), {'GA4_MEASUREMENT_ID': MEASUREMENT_ID,
                                                'CLARITY_PROJECT_ID': CLARITY_ID})
            for source in ({'PATH': '/usr/bin'}, {'CF_PAGES_BRANCH': 'main', 'PATH': '/usr/bin'}):
                with self.subTest(environment=source):
                    result = launch.production_environment(source, path)
                    self.assertEqual(result['GA4_MEASUREMENT_ID'], MEASUREMENT_ID)
                    self.assertEqual(result['CLARITY_PROJECT_ID'], CLARITY_ID)
                    self.assertEqual(result['PATH'], '/usr/bin')
                    self.assertNotIn('GA4_MEASUREMENT_ID', source)
                    self.assertNotIn('CLARITY_PROJECT_ID', source)

    def test_explicit_override_including_blank_does_not_read_fallback(self):
        for value in (MEASUREMENT_ID, '', 'G-invalid'):
            with self.subTest(value=value):
                source = {'GA4_MEASUREMENT_ID': value, 'CLARITY_PROJECT_ID': '',
                          'CF_PAGES_BRANCH': 'main'}
                result = launch.production_environment(source, ROOT / 'does-not-exist.json')
                self.assertEqual(result['GA4_MEASUREMENT_ID'], value)
                if value == 'G-invalid':
                    with self.assertRaises(ValueError):
                        production.measurement_settings(result['GA4_MEASUREMENT_ID'])
                else:
                    self.assertEqual(production.measurement_settings(result['GA4_MEASUREMENT_ID']), value or None)

    def test_each_provider_override_is_independent_including_blank_disable(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = self.config(Path(temporary), {'GA4_MEASUREMENT_ID': MEASUREMENT_ID,
                                                'CLARITY_PROJECT_ID': CLARITY_ID})
            for source, expected in (
                ({'GA4_MEASUREMENT_ID': ''}, ('', CLARITY_ID)),
                ({'CLARITY_PROJECT_ID': ''}, (MEASUREMENT_ID, '')),
                ({'GA4_MEASUREMENT_ID': 'G-ZYXWVU9876'}, ('G-ZYXWVU9876', CLARITY_ID)),
                ({'CLARITY_PROJECT_ID': 'other123'}, (MEASUREMENT_ID, 'other123')),
            ):
                with self.subTest(environment=source):
                    result = launch.production_environment(source, path)
                    self.assertEqual((result['GA4_MEASUREMENT_ID'], result['CLARITY_PROJECT_ID']), expected)
                    self.assertEqual(len(source), 1)
            result = launch.production_environment(
                {'GA4_MEASUREMENT_ID': '', 'CLARITY_PROJECT_ID': ''},
                ROOT / 'does-not-exist.json')
            self.assertEqual(result, {'GA4_MEASUREMENT_ID': '', 'CLARITY_PROJECT_ID': ''})

    def test_preview_branches_disable_even_explicit_id_and_need_no_config_file(self):
        for branch in ('feature/analytics', 'preview', ''):
            with self.subTest(branch=branch):
                result = launch.production_environment(
                    {'CF_PAGES_BRANCH': branch, 'GA4_MEASUREMENT_ID': MEASUREMENT_ID,
                     'CLARITY_PROJECT_ID': CLARITY_ID},
                    ROOT / 'does-not-exist.json')
                self.assertEqual(result['GA4_MEASUREMENT_ID'], '')
                self.assertEqual(result['CLARITY_PROJECT_ID'], '')

    def test_fallback_config_failures_are_not_silently_disabled(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            with self.assertRaises(FileNotFoundError):
                launch.production_environment({}, directory / 'missing.json')
            for value in ([], {}, {'GA4_MEASUREMENT_ID': None}, {'GA4_MEASUREMENT_ID': 123},
                          {'GA4_MEASUREMENT_ID': MEASUREMENT_ID},
                          {'GA4_MEASUREMENT_ID': MEASUREMENT_ID, 'CLARITY_PROJECT_ID': None},
                          {'GA4_MEASUREMENT_ID': MEASUREMENT_ID, 'CLARITY_PROJECT_ID': 123}):
                with self.subTest(value=value), self.assertRaises(ValueError):
                    launch.production_environment({}, self.config(directory, value))
            path = directory / 'invalid.json'
            path.write_text('{invalid')
            with self.assertRaises(json.JSONDecodeError):
                launch.production_environment({}, path)
            path = self.config(directory, {'GA4_MEASUREMENT_ID': 'G-invalid',
                                           'CLARITY_PROJECT_ID': 'bad/id'})
            result = launch.production_environment({}, path)
            with self.assertRaises(ValueError):
                production.measurement_settings(result['GA4_MEASUREMENT_ID'])
            with self.assertRaises(ValueError):
                production.clarity_settings(result['CLARITY_PROJECT_ID'])

    def test_fallback_environment_is_passed_only_to_production_builder(self):
        environment = {'GA4_MEASUREMENT_ID': MEASUREMENT_ID}
        with patch.object(launch, 'production_environment', return_value=environment), \
                patch.object(launch, 'run') as run, patch('builtins.print'):
            launch.main()
        builder_calls = [call for call in run.call_args_list
                         if 'scripts/build-production.py' in call.args]
        self.assertEqual(len(builder_calls), 1)
        self.assertEqual(builder_calls[0].kwargs, {'env': environment})
        self.assertTrue(all(not call.kwargs for call in run.call_args_list
                            if 'scripts/build-production.py' not in call.args))


if __name__ == '__main__':
    unittest.main()
