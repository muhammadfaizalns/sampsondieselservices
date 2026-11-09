"""Convert the business-supplied Australian suburb spreadsheet into the contact form lookup data.

Usage: python3 scripts/import-suburbs.py path/to/Suburbs.xlsx
Expects columns: Name of Suburb, Post Code, Country, State. Requires openpyxl.
"""
from pathlib import Path
import json
import re
import sys

import openpyxl

STATES = {
    'New South Wales': 'NSW', 'Victoria': 'VIC', 'Queensland': 'QLD', 'Western Australia': 'WA',
    'South Australia': 'SA', 'Tasmania': 'TAS', 'Northern Territory': 'NT',
    'Australian Capital Territory': 'ACT',
}
OUTPUT = Path(__file__).resolve().parents[1] / 'dist/assets/data/au-suburbs.json'


def convert(source):
    sheet = openpyxl.load_workbook(source, read_only=True, data_only=True).active
    rows = list(sheet.iter_rows(values_only=True))
    if [str(cell).strip() for cell in rows[0][:4]] != ['Name of Suburb', 'Post Code', 'Country', 'State']:
        raise ValueError('Unexpected spreadsheet columns.')
    result = set()
    for name, postcode, country, state in (row[:4] for row in rows[1:]):
        name, postcode = str(name or '').strip(), str(postcode or '').strip().zfill(4)
        if country != 'Australia' or state not in STATES or not name or not re.fullmatch(r'\d{4}', postcode):
            raise ValueError(f'Invalid suburb row: {name!r} {postcode!r} {country!r} {state!r}')
        result.add((name, postcode, STATES[state]))
    return sorted(result, key=lambda item: (item[0].lower(), item[2], item[1]))


if __name__ == '__main__':
    suburbs = convert(sys.argv[1])
    OUTPUT.write_text(json.dumps(suburbs, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps({'suburbs': len(suburbs), 'output': str(OUTPUT.relative_to(OUTPUT.parents[2]))}))
