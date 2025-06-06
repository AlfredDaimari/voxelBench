from dataclasses import dataclass
from nbt.nbt import NBTFile
from pathlib import Path


@dataclass
class MinecraftWorldCoordinates:
    x: int
    y: int
    z: int

def get_world_spawn(world: str) -> MinecraftWorldCoordinates:
    world_nbt_file_path = Path(__file__).parent.parent.parent.parent.parent.parent / f"worlds/{world}/level.dat"
    nbt_file = NBTFile(world_nbt_file_path)
    data = nbt_file["Data"]
    return MinecraftWorldCoordinates(data["SpawnX"].value, data["SpawnY"].value, data["SpawnZ"].value)

