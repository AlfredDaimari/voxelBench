# code file to switch on all redstone contraptions to state 'ON'

from amulet import load_level, Block
from amulet_nbt import StringTag
from pathlib import Path
from tqdm import tqdm

# Path to your world folder (not region folder, but the root save folder)
WORLD_PATH = str(Path(__file__).parent.parent.parent / "worlds/RedstoneMountainVillage")

# Blocks and their powered blockstates to set
POWERED_BLOCKS = {
    'universal_minecraft:lever': {'powered': StringTag('true')},
    'universal_minecraft:stone_button': {'powered': StringTag('true')},
    'universal_minecraft:wooden_button': {'powered': StringTag('true')},
    'universal_minecraft:tripwire_hook': {'powered': StringTag('true')},

    'universal_minecraft:redstone_torch': {'lit': StringTag('true')},
    'universal_minecraft:redstone_wall_torch': {'lit': StringTag('true')},
    'universal_minecraft:redstone_block': {},  # always powered by default

    'universal_minecraft:redstone_wire': {'power': StringTag('15')},

    'universal_minecraft:repeater': {'powered': StringTag('true')},
    'universal_minecraft:comparator': {'powered': StringTag('true')},

    'universal_minecraft:daylight_detector': {'powered': StringTag('true')},
    'universal_minecraft:daylight_detector_inverted': {'powered': StringTag('true')},

    'universal_minecraft:powered_rail': {'powered': StringTag('true')},
    'universal_minecraft:activator_rail': {'powered': StringTag('true')},
}

def process_chunk(level, chunk_coords):
    chunk = level.get_chunk(*chunk_coords, 'minecraft:overworld')
    if not chunk:
        return

    # Loop over all blocks in the chunk
    for x in range(16):
        for z in range(16):
            for y in range(256):
                block = chunk.get_block(x, y, z)
                block_name = block.namespaced_name

                if block_name in POWERED_BLOCKS:
                    new_state = POWERED_BLOCKS[block_name]
                    # Copy current blockstate dict and update powered states
                    new_blockstate = block.properties
                    new_blockstate.update(new_state)

                    # Set the block with updated powered states
                    namespace = block_name.split(':')[0]
                    base_name = block_name.split(':')[1]
                    new_block = Block(namespace, base_name, new_blockstate)
                    chunk.set_block(x, y, z, new_block)

    # Save changes to the chunk back into the level
    level.put_chunk(chunk, 'minecraft:overworld')

def main():
    print(f"Loading world from {WORLD_PATH}...")
    level = load_level(WORLD_PATH)
    print("World loaded.")

    chunk_coords_list = list(level.all_chunk_coords('minecraft:overworld'))

    print(f"Processing {len(chunk_coords_list)} chunks...")
    for i in tqdm(range(len(chunk_coords_list))):
        chunk_coords = chunk_coords_list[i]
        process_chunk(level, chunk_coords)

    print("Saving world...")
    level.save()
    print("Done!")

if __name__ == "__main__":
    main()

