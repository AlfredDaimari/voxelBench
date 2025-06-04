from yardstick_benchmark.model import Node, RemoteAction, VagrantNode
from pathlib import Path


def fetch(dest: Path, nodes: list[Node] | list[VagrantNode]):
    dest.mkdir(parents=True, exist_ok=True)
    return RemoteAction(
        "fetch",
        nodes,
        Path(__file__).parent / "fetch.yml",
        extravars={"dest": str(dest)},
    ).run()


def clean(nodes: list[Node]):
    return RemoteAction(
        "clean",
        nodes,
        Path(__file__).parent / "clean.yml",
    ).run()
