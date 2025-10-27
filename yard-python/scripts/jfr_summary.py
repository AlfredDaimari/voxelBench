#G!/usr/bin/env python3
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
import threading
import tqdm
import os
import csv
from datetime import datetime

# Events representing sleeping and synchronization in JFR
SLEEP_EVENTS = {"jdk.ThreadPark"}
SYNC_EVENTS = {"jdk.JavaMonitorWait", "jdk.JavaMonitorEnter"}
LOAD_EVENTS = {"jdk.ThreadCPULoad"}


def _parse_duration(value: str) -> float:
    """Convert a JFR duration string to seconds."""
    value = value.replace("PT", "")
    value = value.replace("S", "")
    val = float(value)
    return val * 1000000000


def _parse_json(jfr_file: Path, json_ss: Path, json_CPU: Path) -> None:
    sleep_ms = 0
    sleep_ns = 0
    sleep_ns_count = 0
    sync_ns = 0
    sync_ns_count = 0
    avg_pct = 0
    avg_pct_count = 0

    # GET sync sleep statistics
    with open(json_ss, "r") as f:
        res = f.read()
        re_duration = re.compile(r'duration = ([\d.])+\s*(\w+)')
        re_thread = re.compile(r'eventThread = "([^"]+)"')
        re_start_time = re.compile(r"startTime\s*=\s*([\d:.]+)")

        blocks = res.split('jdk.ThreadPark {')
        unit_ms = {"ns":1e-6, "us":1e-3, "ms":1.0, "s":1000.0}
        fp_sleep = []

        """
        When you want to switch to using json format and get sync/sleep time
        for event in res["recording"]["events"]:
            values = event.get("values", {})
            thread = values.get("eventThread", {})
            thread = thread.get("javaName", "")

            if thread != "Server thread":
                continue

            etype = event.get("type", "")

            duration = values.get("duration")
            duration_ns = _parse_duration(duration)

            if etype in SLEEP_EVENTS:
                sleep_ns += duration_ns
                sleep_ns_count += 1
            elif etype in SYNC_EVENTS:
                sync_ns += duration_ns
                sync_ns_count += 1
        """
        for block in blocks[1:]:
            if not block.strip():
                continue

            thread = re_thread.search(block)
            thread = thread.group(1)
            if not thread:
                continue
            if "Server thread" not in thread:
                continue
            
            duration = re_duration.search(block)
            start_time = re_start_time.search(block)
            
            #if not 'IAsyncTaskHandler.bq' in block:
            #    continue
            
            if duration:
                val, unit = duration.groups()
                slms = float(val) * unit_ms.get(unit,0)
                sleep_ms += slms
                st_time = start_time.group(1)
                fp_sleep.append((st_time, slms))

    # GET CPU load statistics
    with open(json_CPU, "rb") as f:
        res = json.load(f)
        fp = []

        for event in res["recording"]["events"]:
            try:
                values = event.get("values", {})
                thread = values.get("eventThread", {})
                thread = thread.get("javaName", "")
            except:
                continue

            if thread != "Server thread":
                continue

            etype = event.get("type", "")
            if etype in LOAD_EVENTS:
                avg_pct += float(values.get("user", 0.0)) + float(
                    values.get("system", 0.0)
                )
                fp.append(avg_pct)
                avg_pct_count += 1

    cpu_usage = avg_pct / avg_pct_count * 100

    print(
        f"{jfr_file.stem}: sleeping {sleep_ms/1_000:.3f}s, "
        f"syncing {sync_ns/1_000_000_000:.3f}s, "
        f"CPU Usage - {cpu_usage:.3f}%, "
        f"Sleep count - {sleep_ns_count}, "
        f"Sync count - {sync_ns_count}"
    )
    #print(fp_sleep)
    #print("x-x-x-x-x-x-x-x")
    print(fp)

    # just code to get the sync time for vm7
    if "vm7" in jfr_file.stem:
        with open('/mnt/extra/sync/vm7-thread-park.csv', 'w+', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['time', 'value'])
            reference_date = '2025-09-02'

            # Write each row
            for time, value in fp_sleep:
                dt = datetime.strptime(f"{reference_date} {time}", '%Y-%m-%d %H:%M:%S.%f')
                timestamp = int(dt.timestamp() * 1000)
                writer.writerow([timestamp, value])


def _summarize_file(jfr_path: Path) -> None:
    """Summarize file into json output"""

    cmd = [
        "jfr",
        "print",
        "--events",
        "jdk.ThreadPark",
        str(jfr_path),
    ]
    with open(jfr_path.parent / f"{jfr_path.stem}-out.txt", mode="w+") as f:
        subprocess.run(cmd, stdout=f, check=True)

    cmd2 = ["jfr", "print", "--json", "--events", "jdk.ThreadCPULoad", str(jfr_path)]
    with open(jfr_path.parent / f"{jfr_path.stem}-out2.json", mode="wb+") as f:
        subprocess.run(cmd2, stdout=f, check=True)


def _iter_jfr_files(directory: Path) -> list[Path]:
    return list(directory.rglob("*.jfr"))


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python jfr_summary.py <directory>")
        sys.exit(1)
    directory = Path(sys.argv[1])

    jfr_files = _iter_jfr_files(directory)
    for i in tqdm.tqdm(range(len(jfr_files))):
        jfr_file = jfr_files[i]
        # create json files
        _summarize_file(jfr_file)
        # output json stats
        _parse_json(
            jfr_file,
            jfr_file.parent / f"{jfr_file.stem}-out.txt",
            jfr_file.parent / f"{jfr_file.stem}-out2.json",
        )
    
        # remove files (need the extra space)
        os.remove(jfr_file.parent / f"{jfr_file.stem}-out.txt")
        os.remove(jfr_file.parent / f"{jfr_file.stem}-out2.json")

if __name__ == "__main__":
    main()
