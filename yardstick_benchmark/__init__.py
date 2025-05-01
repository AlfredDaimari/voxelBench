from yardstick_benchmark.model import Node, NodeVagrant,RemoteAction
from pathlib import Path


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
        "fetch-master",
        nodes,
        Path(__file__).parent.parent / "ansible/master-fetch.yaml",
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
