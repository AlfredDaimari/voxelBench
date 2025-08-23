from yardstick_benchmark.model import RemoteApplication, Node, VagrantNode
from yardstick_benchmark.games.minecraft.utils import get_world_spawn
from pathlib import Path
from datetime import timedelta
from glob import glob
from itertools import chain
from enum import Enum

class Work(Enum):
    walk = "walk"
    pvp = "pvp"
    pve = "pve"
    build = "build"
    redstone = "redstone"


class Workload(RemoteApplication):
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
        max_radius: int = 10000,
        workload: str = "walk",
        world: str = "CastleLividus",
        mob: str = "polar_bear",
        seed: str = "0"
    ):
        jsdir = Path(__file__).parent.parent.parent.parent.parent.parent / "yard-js"
        scripts = [
            file
            for file in chain(glob(str(jsdir) + "/*.js"), glob(str(jsdir) + "/*.json"))
        ]
        scripts.append(str(Path(__file__).parent / "set_spawn.js"))

        super().__init__(
            "walkaround",
            nodes,
            Path(__file__).parent / "bot_deploy.yml",
            Path(__file__).parent / "workload_start.yml",
            Path(__file__).parent / "workload_stop.yml",
            Path(__file__).parent / "bot_cleanup.yml",
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
                "max_radius": max_radius,
                "workload": workload,
                "world_name": world,
                "mob": mob,
                "seed": seed
            },
        )

    # remember to call this function before running workload
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
            self.inv["all"]["hosts"][nodes[i].name]["record"] = 1
        for i in range(total, len(nodes)):
            self.inv["all"]["hosts"][nodes[i].name]["record"] = 0

    def _setup_spawn_for_each_bot_node(self, spawn_locs:list[str]):
        assert len(spawn_locs) == len(self.nodes)
        
        for i in range(len(self.nodes)):
            spawn_loc = spawn_locs[i].split(":")
            assert len(spawn_loc) == 2 # check for correctness 
            
            spawn_loc_x = int(spawn_loc[0])
            spawn_loc_z = int(spawn_loc[1])
            self.inv["all"]["hosts"][self.nodes[i].name]["spawn_x"] = spawn_loc_x
            self.inv["all"]["hosts"][self.nodes[i].name]["spawn_z"] = spawn_loc_z

    @property
    def bots_per_node(self) -> int:
        return self.extravars["bots_per_node"]

    @bots_per_node.setter
    def bots_per_node(self, bots_per_node: int):
        self.extravars["bots_per_node"] = bots_per_node
    
    @property
    def bots_join_delay(self) -> int:
        return self.extravars["bots_join_delay"] 
    

    @bots_join_delay.setter
    def bots_join_delay(self, delay:timedelta):
        """
        Reset bots join delay to a new timing

        Parameter
        ----
        delay: timedelta
            time delay between two bots joining
        Other Info
        ----
        This also updates the duration setting of the workload
        """

        self.extravars["bots_join_delay"] = delay.total_seconds()
        self.extravars["duration"] = 30 + self.bots_join_delay * self.bots_per_node + 60*3

    @property
    def duration(self):
        return self.extravars["duration"]

    def setup_new_experiment(self, workload: Work, radius: int, density: int, seed:str, spawn:list[str] = []) -> None:
        assert workload in Work.__members__
        self.extravars["workload"] = workload
        self.extravars["max_radius"] = radius
        self.extravars["density"] = density
        self.extravars["seed"] = seed

        # setting up world spawn
        world_spawn  = get_world_spawn(self.extravars["world_name"])
        self.extravars["spawn_y"] = world_spawn.y
        # first check if spawn locations have been given

        if len(spawn) == 0:
            self.extravars["spawn_x"] = world_spawn.x
            self.extravars["spawn_z"] = world_spawn.z
        else:
            self.extravars.pop("spawn_x", None)
            self.extravars.pop("spawn_y", None)
            self._setup_spawn_for_each_bot_node(spawn)


    
