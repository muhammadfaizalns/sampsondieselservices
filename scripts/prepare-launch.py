"""Validate source and create the Cloudflare production artifact. Does not deploy."""
from pathlib import Path
import json
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE_URL = 'https://sampsonheavydiesel.com.au'
PRODUCTION_CONFIG = ROOT / 'scripts/production-config.json'


def production_environment(environment=None, configuration_path=PRODUCTION_CONFIG):
    """Use public production settings only when no explicit build override exists."""
    result = dict(os.environ if environment is None else environment)
    branch = result.get('CF_PAGES_BRANCH')
    if branch is not None and branch != 'main':
        result['GA4_MEASUREMENT_ID'] = ''
        result['CLARITY_PROJECT_ID'] = ''
        result['PLAUSIBLE_SCRIPT_URL'] = ''
        return result
    missing = [key for key in ('GA4_MEASUREMENT_ID', 'CLARITY_PROJECT_ID') if key not in result]
    configuration = None
    if missing:
        configuration = json.loads(configuration_path.read_text())
        for key in missing:
            if not isinstance(configuration, dict) or not isinstance(configuration.get(key), str):
                raise ValueError(f'Public production config must contain a string {key}.')
            result[key] = configuration[key]
    if 'PLAUSIBLE_SCRIPT_URL' not in result and (configuration is not None or configuration_path.is_file()):
        if configuration is None:
            configuration = json.loads(configuration_path.read_text())
        value = configuration.get('PLAUSIBLE_SCRIPT_URL', '') if isinstance(configuration, dict) else ''
        if not isinstance(value, str):
            raise ValueError('Public production config PLAUSIBLE_SCRIPT_URL must be a string.')
        result['PLAUSIBLE_SCRIPT_URL'] = value
    return result


def run(*args, env=None):
    subprocess.run(args, cwd=ROOT, check=True, env=env)


def main():
    run(sys.executable, 'scripts/build-pages.py')
    run(sys.executable, 'scripts/audit-site.py')
    run(sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-q')
    for name in ('components.js', 'coverage.js', 'gearbox-loader.js', 'gearbox.js', 'motion.js', 'analytics.js'):
        run('node', '--check', 'dist/' + name)
    run('node', '--test', 'tests/test_analytics.mjs')
    run(sys.executable, 'scripts/build-production.py', '--site-url', SITE_URL,
        env=production_environment())
    run(sys.executable, 'scripts/audit-search-readiness.py', '--directory', '_production',
        '--site-url', SITE_URL, '--mode', 'production')
    print('Production artifact ready in _production. Hosting, DNS and provider dashboards require separate setup.')


if __name__ == '__main__':
    main()
