from yardstick_benchmark.model import Node, NodeVagrant,RemoteAction
from pathlib import Path
import time
from mcstatus import JavaServer
from datetime import datetime, timezone


def fetch(dest: Path, nodes: list[Node] | list[NodeVagrant]):
    dest.mkdir(parents=True, exist_ok=True)
    return RemoteAction(
        "fetch",
        nodes,
        Path(__file__).parent / "fetch.yml",
        extravars={"dest": str(dest)},
    ).run()

def fetch_master(dest: Path, nodes: list[NodeVagrant]):
    dest.mkdir(parents=True, exist_ok=True)
    return RemoteAction(
        "fetch-master-bot-telegraf",
        nodes,
        Path(__file__).parent.parent / "ansible/monitoring/master-bot-telegraf-fetch.yaml",
        extravars={"dest": str(dest)},
    ).run()

def fetch_master_bot_telegraf(dest: Path, nodes: list[NodeVagrant]):
    dest.mkdir(parents=True, exist_ok=True)
    return RemoteAction(
        "fetch-master",
        nodes,
        Path(__file__).parent.parent / "ansible/master-fetch.yaml",
        extravars={"dest": str(dest)},
    ).run()

def fetch_bot(dest: Path, nodes: list[NodeVagrant]):
    dest.mkdir(parents=True, exist_ok=True)
    return RemoteAction(
        "fetch-bot",
        nodes,
        Path(__file__).parent.parent / "ansible/bot-fetch.yaml",
        extravars={"dest": str(dest)},
    ).run()

def start_sysstat_master(nodes: list[NodeVagrant]):
    return RemoteAction(
        "master-sysstat-start",
        nodes,
        Path(__file__).parent.parent / "ansible/sysstat-start-master.yaml",
    ).run()


def stop_sysstat_master(nodes: list[NodeVagrant]):
    return RemoteAction(
        "master-sysstat-stop",
        nodes,
        Path(__file__).parent.parent / "ansible/sysstat-stop-master.yaml",
    ).run()


def clean(nodes: list[Node] | list[NodeVagrant]):
    return RemoteAction(
        "clean",
        nodes,
        Path(__file__).parent / "clean.yml",
    ).run()


# query server for total players
def query_players(host: str, seconds: int) -> None:
    server = JavaServer.lookup(f"{host}:25565")
    i = 0
    with open("player_count.log", "w") as f:
        f.write(f"timestamp, player_count\n")
        
        try:
            while i < seconds:
                i += 1
                status = server.status()
                f.write(f"{datetime.now(timezone.utc)}, {status.players.online}\n")
                time.sleep(1)
        except:
            # continue to run again in case of error
            if i < seconds:
                query_players(host, seconds-i)


