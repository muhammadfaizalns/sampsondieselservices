"""Validate source and create the Cloudflare production artifact. Does not deploy."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE_URL = 'https://sampsonheavydiesel.com'


def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)


def main():
    run(sys.executable, 'scripts/build-pages.py')
    run(sys.executable, 'scripts/audit-site.py')
    run(sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-q')
    for name in ('components.js', 'coverage.js', 'gearbox-loader.js', 'gearbox.js', 'motion.js', 'analytics.js'):
        run('node', '--check', 'dist/' + name)
    run('node', '--test', 'tests/test_analytics.mjs')
    run(sys.executable, 'scripts/build-production.py', '--site-url', SITE_URL)
    run(sys.executable, 'scripts/audit-search-readiness.py', '--directory', '_production',
        '--site-url', SITE_URL, '--mode', 'production')
    print('Production artifact ready in _production. Hosting, DNS and provider dashboards require separate setup.')


if __name__ == '__main__':
    main()
