#!/usr/bin/env python3
"""Run the JEV hook script wherever this machine keeps it.

settings.json calls this launcher instead of a machine-specific absolute path.
If the script cannot be found, exit 0 with a notice so a missing install never
blocks a prompt (a failed `python <missing file>` exits 2, which blocks).
"""
import json
import os
import sys
from pathlib import Path

CANDIDATES = (
    "~/.local/share/master-jev-hook/claude_jev.py",
    "~/.local/share/typesafe-jev-claude/claude_jev.py",
    "~/projects/master-jev-hook/claude_jev.py",
)


def find_script() -> Path | None:
    override = os.environ.get("JEV_HOOK_SCRIPT")
    for raw in ((override,) if override else ()) + CANDIDATES:
        path = Path(raw).expanduser()
        if path.is_file():
            return path
    return None


def main() -> None:
    script = find_script()
    if script is None:
        print(json.dumps({"systemMessage": "JEV hook script not found (tried master-jev-hook, typesafe-jev-claude); JEV checks skipped on this machine."}))
        sys.exit(0)
    os.execv(sys.executable, [sys.executable, str(script), *sys.argv[1:]])


if __name__ == "__main__":
    main()
