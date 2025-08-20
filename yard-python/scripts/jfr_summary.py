#!/usr/bin/env python3
"""Summarize JFR recordings for the Minecraft "Main Server" thread.

Given a directory, this script searches for ``*.jfr`` files and, for each
recording, computes the time the ``Main Server`` thread spent sleeping versus
waiting on synchronization primitives.  The script relies on the ``jfr`` CLI
being available in ``PATH`` and parses its JSON output.

Example
-------
    python jfr_summary.py /path/to/recordings
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, Tuple

# Events representing sleeping and synchronization in JFR
SLEEP_EVENTS = {"jdk.ThreadPark"}
SYNC_EVENTS = {"jdk.JavaMonitorWait", "jdk.JavaMonitorEnter"}


def _parse_duration(value: str) -> float:
    """Convert a JFR duration string to seconds."""
    value = value.replace('PT','')
    value = value.replace('S', '')
    val = float(value)
    return (val * 1000000000) 

def _summarize_file(jfr_path: Path) -> Tuple[float, float]:
    """Return sleeping and syncing time (in ns) for the Main Server thread."""
    cmd = [
        "jfr",
        "print",
        "--json",
        "--events",
        "jdk.ThreadSleep,jdk.JavaMonitorWait,jdk.JavaMonitorEnter",
        str(jfr_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)

    sleep_ns = 0
    sync_ns = 0

    res = json.loads(result.stdout)

    for event in res['recording']['events']:
        values = event['values']
        thread = values['eventThread']['javaName']

        if thread != "Server thread":
            continue

        duration = values.get("duration")
        duration_ns = _parse_duration(duration) 
        etype = event.get("type", "")

        if etype in SLEEP_EVENTS:
            sleep_ns += duration_ns
        elif etype in SYNC_EVENTS:
            sync_ns += duration_ns
    
    return sleep_ns, sync_ns


def _iter_jfr_files(directory: Path) -> Iterable[Path]:
    return directory.rglob("*.jfr")


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python jfr_summary.py <directory>")
        sys.exit(1)
    directory = Path(sys.argv[1])
    for jfr_file in _iter_jfr_files(directory):
        sleep_ns, sync_ns = _summarize_file(jfr_file)
        print(
            f"{jfr_file.stem}: sleeping {sleep_ns/1_000_000_000:.3f}s, "
            f"syncing {sync_ns/1_000_000_000:.3f}s"
        )


if __name__ == "__main__":
    main()
