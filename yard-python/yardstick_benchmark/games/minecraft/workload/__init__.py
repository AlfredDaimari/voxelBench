from yardstick_benchmark.model import RemoteApplication, Node, VagrantNode
from pathlib import Path
from datetime import timedelta


class WalkAround(RemoteApplication):
    def __init__(
        self,
        nodes: list[Node] | list[VagrantNode],
        server_host: str,
        duration: timedelta = timedelta(seconds=60),
        spawn_x: int = 0,
        spawn_y: int = 64,
        spawn_z: int = 0,
        box_width: int = 32,
        box_x: int = -16,
        box_z: int = -16,
        bots_join_delay: timedelta = timedelta(seconds=5),
        bots_per_node: int = 1,
        density: int = 1,
        max_radius: int = 10000
    ):
        scripts = [
            str(
                Path(__file__).parent.parent.parent.parent.parent.parent
                / "yard-js/walkaround_bot.js"
            ),
            str(
                Path(__file__).parent.parent.parent.parent.parent.parent
                / "yard-js/walkaround_worker_bot.js"
            ),
            str(Path(__file__).parent / "set_spawn.js"),
        ]
        super().__init__(
            "walkaround",
            nodes,
            Path(__file__).parent / "walkaround_deploy.yml",
            Path(__file__).parent / "walkaround_start.yml",
            Path(__file__).parent / "walkaround_stop.yml",
            Path(__file__).parent / "walkaround_cleanup.yml",
            extravars={
                "hostnames": [n.host for n in nodes]
                if isinstance(nodes[0], Node)
                else [n.name for n in nodes],
                "scripts": scripts,
                "duration": duration.total_seconds(),
                "mc_host": server_host,
                "spawn_x": spawn_x,
                "spawn_y": spawn_y,
                "spawn_z": spawn_z,
                "box_width": box_width,
                "box_x": box_x,
                "box_z": box_z,
                "bots_join_delay": bots_join_delay.total_seconds(),
                "bots_per_node": bots_per_node,
                "density": density,
                "max_radius":max_radius
            },
        )

    # remember to call this function before running WalkAround
    def setup_recording_nodes(self, nodes: list[VagrantNode], total: int = 0):
        """
        Sets up bot nodes that would record gameplay

        Parameters
        ----------
        total: int, optional
            The total number of bots that you want recording
        """
        assert total <= len(nodes)
        for i in range(total):
            self.inv["all"]["hosts"][nodes[i].name]["record"] = True
        for i in range(total, len(nodes)):
            self.inv["all"]["hosts"][nodes[i].name]["record"] = False
