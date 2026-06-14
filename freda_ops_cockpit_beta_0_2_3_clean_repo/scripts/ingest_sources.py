#!/usr/bin/env python3
"""Regenerate Freda Ops seed data from exported files.

Usage:
  python scripts/ingest_sources.py --source-dir /path/to/exports --out web/assets/seed-data.js

This starter script intentionally avoids live credentials. For reporting.site or Odoo, use environment variables and rotate any old session cookies before connecting live systems.
"""
import argparse, json
from pathlib import Path
from datetime import datetime


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', default='.', help='Folder containing CSV/XLSX/ZIP exports')
    parser.add_argument('--out', default='web/assets/seed-data.js', help='Output JS seed file')
    args = parser.parse_args()
    source = Path(args.source_dir)
    payload = {
        'meta': {'appName': 'Freda Ops Cockpit', 'version': 'Beta 0.1 regenerated', 'generatedAt': datetime.utcnow().isoformat() + 'Z'},
        'sourceStatus': [{'source': p.name, 'status': 'Detected', 'confidence': 'Needs parser', 'notes': str(p)} for p in source.iterdir() if p.is_file()],
        'briefing': ['Seed regenerated shell. Add parsers for CSV/XLSX/ZIP in Beta 0.2.'],
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('window.FREDA_OPS_SEED = ' + json.dumps(payload, indent=2) + ';\n', encoding='utf-8')
    print(f'Wrote {out}')

if __name__ == '__main__':
    main()
