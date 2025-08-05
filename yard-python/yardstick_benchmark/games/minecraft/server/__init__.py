from yardstick_benchmark.model import RemoteAction, RemoteApplication, Node, VagrantNode
import os
from pathlib import Path


class PaperMC(RemoteApplication):
    def __init__(self, nodes: list[Node] | list[VagrantNode]):
        super().__init__(
            "papermc",
            nodes,
            Path(__file__).parent / "papermc_deploy.yml",
            Path(__file__).parent / "papermc_start.yml",
            Path(__file__).parent / "papermc_stop.yml",
            Path(__file__).parent / "papermc_cleanup.yml",
            extravars={
                "server_properties_template": str(
                    Path(__file__).parent / "server.properties.j2"
                ),
                "plugins": str(Path(__file__).parent.parent / "plugins"),
                "downloads": str(
                    Path(__file__).parent.parent.parent.parent.parent.parent
                    / "downloads"
                ),
            },
        )

    # remember to call this function before deploying
    def set_world_as(self, path: Path):
        self.extravars["world_path"] = str(path)
        self.extravars["world_name"] = str(path).split("/")[-1].split(".")[0]


class MultiPaper(RemoteApplication):
    def __init__(
        self, master_node: list[VagrantNode], worker_nodes: list[VagrantNode], tag: str
    ):
        if tag == "master":
            # creating master extra vars
            servers = []
            length = 0
            for node in worker_nodes:
                length += 2
                servers.append(f"{node.ansible_host} {node.name}")
            servers = " ".join(servers)

            super().__init__(
                "multipaper-master",
                master_node,
                Path(__file__).parent / "multipaper_master_deploy.yml",
                Path(__file__).parent / "multipaper_master_start.yml",
                Path(__file__).parent / "multipaper_master_stop.yml",
                Path(__file__).parent / "multipaper_cleanup.yml",
                extravars={
                    "servers": servers,
                    "length": length,
                    "downloads": str(
                        Path(__file__).parent.parent.parent.parent.parent.parent
                        / "downloads"
                    ),
                },
            )
        else:
            super().__init__(
                "multipaper-worker",
                worker_nodes,
                Path(__file__).parent / "multipaper_worker_deploy.yml",
                Path(__file__).parent / "multipaper_worker_start.yml",
                Path(__file__).parent / "multipaper_worker_stop.yml",
                Path(__file__).parent / "multipaper_cleanup.yml",
                extravars={
                    "master": master_node[0].ansible_host,
                    "server_properties_template": str(
                        Path(__file__).parent / "server.properties.j2"
                    ),
                    "plugins": str(Path(__file__).parent.parent / "plugins"),
                    "downloads": str(
                        Path(__file__).parent.parent.parent.parent.parent.parent
                        / "downloads"
                    ),
                },
            )

    # remember to call this function before deploying
    def set_world_as(self, path: Path):
        self.extravars["world_path"] = str(path)
        self.extravars["world_name"] = str(path).split("/")[-1].split(".")[0]

    def restart(self):
        """
        Warning: This can only be safely done for worker nodes
        """
        assert self.deploy_action.name == "multipaper-worker"
        return RemoteAction(
            "worker-restart",
            self.nodes,
            Path(__file__).parent / "multipaper_worker_restart.yml",
        ).run()
