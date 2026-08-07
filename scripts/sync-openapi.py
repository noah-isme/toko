#!/usr/bin/env python3
"""
Sync toko/openapi.yaml from toko-api/openapi.yaml.

The frontend openapi.yaml is a static snapshot used as a reference for
frontend developers. This script copies all paths and schemas from the
backend's canonical openapi.yaml so the two stay in sync.

Usage:
    python scripts/sync-openapi.py

Run from the toko repo root. Requires toko-api as a sibling directory,
or set TOKO_API_PATH env var.
"""

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API_PATH = Path(os.environ.get("TOKO_API_PATH", ROOT.parent / "toko-api"))
BE_OPENAPI = API_PATH / "openapi.yaml"
FE_OPENAPI = ROOT / "openapi.yaml"


def extract_paths(content: str) -> tuple[str, str]:
    """Split openapi into (paths_section, rest). Returns (paths_yaml, components_and_beyond)."""
    # Find the `paths:` key at root level (2-space indent)
    paths_match = re.search(r"^paths:\n", content, re.MULTILINE)
    if not paths_match:
        raise ValueError("No 'paths:' section found")

    # Find `components:` at root level — it marks the end of paths
    comps_match = re.search(r"^components:\n", content, re.MULTILINE)
    if not comps_match:
        raise ValueError("No 'components:' section found")

    paths_yaml = content[paths_match.end():comps_match.start()]
    rest = content[comps_match.start():]
    return paths_yaml, rest


def main() -> int:
    if not BE_OPENAPI.exists():
        print(f"ERROR: backend openapi not found at {BE_OPENAPI}", file=sys.stderr)
        return 1

    be_content = BE_OPENAPI.read_text()
    if not FE_OPENAPI.exists():
        print(f"ERROR: frontend openapi not found at {FE_OPENAPI}", file=sys.stderr)
        return 1

    fe_content = FE_OPENAPI.read_text()

    be_paths, be_rest = extract_paths(be_content)
    fe_paths, fe_rest = extract_paths(fe_content)

    # Count paths in each
    be_path_count = len(re.findall(r"^  /api/", be_paths, re.MULTILINE))
    fe_path_count = len(re.findall(r"^  /api/", fe_paths, re.MULTILINE))

    print(f"Backend has {be_path_count} paths, frontend has {fe_path_count} paths")

    if be_path_count == fe_path_count:
        print("No changes needed — paths are in sync")
        return 0

    # Replace FE paths with BE paths
    be_paths_header = "paths:\n"
    new_fe = fe_content.replace(fe_paths, be_paths, 1)

    # Also sync schemas: replace everything from `components:` onwards
    # Extract components from BE
    be_comps_match = re.search(r"^components:\n", be_content, re.MULTILINE)
    fe_comps_match = re.search(r"^components:\n", new_fe, re.MULTILINE)

    if be_comps_match and fe_comps_match:
        be_comps = be_content[be_comps_match.start():]
        new_fe = new_fe[:fe_comps_match.start()] + be_comps
        print(f"Synced {be_path_count} paths and components/schemas")
    else:
        print("WARNING: could not sync components section", file=sys.stderr)

    FE_OPENAPI.write_text(new_fe)
    print(f"Updated {FE_OPENAPI}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
