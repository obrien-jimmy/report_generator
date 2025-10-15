"""Migration script: copy literatureReviewData -> dataObservationData for JSON project files.

Creates a backup with .bak extension before modifying.
Usage: python scripts/migrate_literature_to_data_observation.py
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def process_file(p: Path):
    try:
        text = p.read_text(encoding='utf-8')
        data = json.loads(text)
    except Exception as e:
        print(f"Skipping {p} (not valid JSON): {e}")
        return

    # If dataObservationData already exists, skip
    if 'dataObservationData' in data and data['dataObservationData'] is not None:
        return

    if 'literatureReviewData' in data and data['literatureReviewData'] is not None:
        # create a clear .bak backup
        bak = p.with_name(p.name + '.bak')
        if not bak.exists():
            bak.write_text(text, encoding='utf-8')
            print(f"Backup created: {bak}")

        # Copy legacy field into new key
        data['dataObservationData'] = data.get('literatureReviewData')
        p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
        print(f"Updated {p} -> added dataObservationData from literatureReviewData")

def main():
    json_files = list(ROOT.glob('**/*.json'))
    for f in json_files:
        # skip node_modules or .venv
        if any(part in ('node_modules', '.venv', 'venv') for part in f.parts):
            continue
        process_file(f)

if __name__ == '__main__':
    main()
