"""Validate source and create the Cloudflare production artifact. Does not deploy."""
from pathlib import Path
import json
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE_URL = 'https://sampsonheavydiesel.com'
PRODUCTION_CONFIG = ROOT / 'scripts/production-config.json'


def production_environment(environment=None, configuration_path=PRODUCTION_CONFIG):
    """Use public production settings only when no explicit build override exists."""
    result = dict(os.environ if environment is None else environment)
    branch = result.get('CF_PAGES_BRANCH')
    if branch is not None and branch != 'main':
        result['GA4_MEASUREMENT_ID'] = ''
        return result
    if 'GA4_MEASUREMENT_ID' not in result:
        configuration = json.loads(configuration_path.read_text())
        if (not isinstance(configuration, dict)
                or not isinstance(configuration.get('GA4_MEASUREMENT_ID'), str)):
            raise ValueError('Public production config must contain a string GA4_MEASUREMENT_ID.')
        result['GA4_MEASUREMENT_ID'] = configuration['GA4_MEASUREMENT_ID']
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
