import yardstick_benchmark
from yardstick_benchmark.provisioning import VagrantVMs
from yardstick_benchmark.games.minecraft.server import MultiPaper
from yardstick_benchmark.monitoring import (
    Telegraf,
    start_player_distribution_monitoring,
    stop_player_distribution_monitoring,
)
from yardstick_benchmark.games.minecraft.workload import Workload
from datetime import timedelta, datetime
from time import sleep
from pathlib import Path
from pyfiglet import Figlet
import subprocess
import toml

if __name__ == "__main__":
    # node setup
    sh_file = Path(__file__).parent.parent / "vagrant/vanage.sh"
    subprocess_wd = Path(__file__).parent.parent / "vagrant"
    node_config = Path(__file__).parent.parent / "vagrant/multipaper.toml"
    with open(str(node_config)) as f:
        config = toml.load(f)

    # get benchmark configs
    world = config["benchmark"]["world"]
    player_models = config["benchmark"]["playerModel"]
    densities = config["benchmark"]["density"]
    radiuss = config["benchmark"]["radius"]
    player_counts = config["benchmark"]["players"]
    joinDelaySecs = config["benchmark"]["joinDelaySecs"]
    world_path = Path(__file__).parent.parent / f"worlds/{world}.zip"
    fig_writer = Figlet(font="banner3")

    subprocess.run(["bash", "-c", str(sh_file)], cwd=subprocess_wd)

    # setup world setting
    vagrant = VagrantVMs()
    master_node = vagrant.get_vms_with_tag("master")
    worker_nodes = vagrant.get_vms_with_tag("worker")
    bot_nodes = vagrant.get_vms_with_tag("bot")

    # setup multipaper
    multipaper_master = MultiPaper(master_node, worker_nodes, "master")
    multipaper_worker = MultiPaper(master_node, worker_nodes, "worker")
    multipaper_master.set_world_as(world_path)

    multipaper_master.deploy()
    multipaper_master.start()
    multipaper_worker.deploy()
    multipaper_worker.start()

    # setup bot nodes and telegraph
    wl = Workload(bot_nodes, master_node[0].ansible_host)
    wl.deploy()

    telegraf = Telegraf(master_node + worker_nodes + bot_nodes)
    for worker_node in worker_nodes:
        telegraf.add_input_jolokia_agent(worker_node)
        telegraf.add_input_execd_minecraft_ticks(worker_node)
    telegraf.deploy()

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

                    # setup experiment
                    wl.bots_per_node = player
                    wl.bots_join_delay = timedelta(seconds=joinDelaySecs)
                    wl.setup_new_experiment(model, radius, density)
                    # start running telegraph
                    telegraf.start()
                    # start pdist monitoring
                    start_player_distribution_monitoring(worker_nodes)
                    # run workload
                    wl.setup_recording_nodes(bot_nodes, 0)
                    wl.start()
                    # sleep
                    print(fig_writer.renderText(f"Sleeping =={wl.duration + 10}== seconds"))
                    sleep(wl.duration + 10)
                    # stop running telegrap
                    telegraf.stop()
                    # stop pdist monitoring
                    stop_player_distribution_monitoring(worker_nodes)
                    # copy data files
                    yardstick_benchmark.fetch(
                        dest, master_node + worker_nodes + bot_nodes
                    )
                    # remove data files
                    yardstick_benchmark.clean(master_node + worker_nodes + bot_nodes)
                    # stop restart worker nodes to reset logs
                    multipaper_worker.stop_restart()

    # removing node setup
    # subprocess.run(["bash", "remove.sh"], cwd=subprocess_wd)
