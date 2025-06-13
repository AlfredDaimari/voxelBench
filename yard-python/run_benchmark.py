import yardstick_benchmark
from yardstick_benchmark.provisioning import VagrantVMs
from yardstick_benchmark.games.minecraft.server import MultiPaper
import yardstick_benchmark.games.minecraft.utils as mutils
from yardstick_benchmark.monitoring import Telegraf
from yardstick_benchmark.games.minecraft.workload import WalkAround
from datetime import timedelta, datetime
from time import sleep
from pathlib import Path
import sys
import subprocess
import toml

if __name__ == "__main__":
    # node setup
    sh_file = Path(__file__).parent.parent / "vagrant/vanage.sh"
    subprocess_wd = Path(__file__).parent.parent / "vagrant"
    node_config = Path(__file__).parent.parent / "vagrant/multipaper.toml"
    with open(str(node_config)) as f:
        config = toml.load(f)

    # only reduced to walk and pvp models
    world = config["benchmark"]["WORLD"]
    player_models = config["benchmark"]["playerModel"]
    densities = config["benchmark"]["DENSITY"]
    radiuss = config["benchmark"]["RADIUS"]
    player_counts = config["benchmark"]["PLAYERS"]

    # subprocess.run(["bash", "-c", str(sh_file)], cwd=subprocess_wd)

    # setup world setting
    # setup multipaper
    # setup bot nodes

    # run different set of workloads, and different player counts, different densities (each for 10 minutes)

    for player in player_counts:
        for radius in radiuss:
            for density in densities:
                for model in player_models:
                    print(
                        f"Now running: players:{player} radius:{radius} density:{density} model:{model}"
                    )
                    # creating data directory
                    timestamp = (
                        datetime.now()
                        .isoformat(timespec="minutes")
                        .replace("-", "")
                        .replace(":", "")
                    )
                    dest = Path(
                        Path(__file__).parent.parent
                        / f"data/{timestamp}-{model}-{player}-{density}-{radius}"
                    )
                    dest.mkdir(exist_ok=True, parents=True)
                    # write config file
                    with open(dest / "config.toml", "w") as f:
                        toml.dump(
                            {
                                "model": model,
                                "player": player,
                                "density": density,
                                "radius": radius,
                            },
                            f,
                        )

                    # start running telegraph
                    # run workload
                    # sleep for 10 minutes
                    # stop running telegraph
                    # copy data files
                    # remove data files
                    # stop worker nodes
                    # restart worker nodes
                    # continue to the top of the loop

    # removing node setup
    #subprocess.run(["bash", "remove.sh"], cwd=subprocess_wd)
