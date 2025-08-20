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
import shutil

if __name__ == "__main__":
    # node setup
    sh_file = Path(__file__).parent.parent / "vagrant/vanage.sh"
    sh_remote_file = Path(__file__).parent.parent / "vagrant/remote_vanage.sh"
    
    subprocess_wd = Path(__file__).parent.parent / "vagrant"
    node_config = Path(__file__).parent.parent / "vagrant/multipaper.toml"
    with open(str(node_config)) as f:
        config = toml.load(f)

    # get benchmark configs
    world: str = config["benchmark"]["world"]
    player_model = config["benchmark"]["playerModel"]
    density = config["benchmark"]["density"]
    radius = config["benchmark"]["radius"]
    player_count = config["benchmark"]["players"]
    joinDelaySecs = config["benchmark"]["joinDelaySecs"]
    mob = config["benchmark"]["pve_mob"]
    cpu:int = config["worker"]["cpu"]
    worker_total:int = config["worker"]["total"]

    world_path = Path(__file__).parent.parent / f"worlds/{world}.zip"
    fig_writer = Figlet(font="banner3")

    subprocess.run(["bash", "-c", str(sh_file)], cwd=subprocess_wd)
    # uncomment this when setting up remote bots as well
    # subprocess.run(["bash", "-c", str(sh_remote_file)], cwd=subprocess_wd)

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
    wl = Workload(bot_nodes, master_node[0].ansible_host, mob=mob, world=world)
    wl.deploy()

    telegraf = Telegraf(master_node + worker_nodes + bot_nodes)
    for worker_node in worker_nodes:
        telegraf.add_input_jolokia_agent(worker_node)
        telegraf.add_input_execd_minecraft_ticks(worker_node)
    telegraf.deploy()

    # run different set of workloads, and different player counts, different densities (each for 10 minutes)
    print(
        f"Now running: players:{player_count} radius:{radius} density:{density} model:{player_model}"
    )
    # creating data directory
    timestamp = (
        datetime.now().isoformat(timespec="minutes").replace("-", "").replace(":", "")
    )
    dest = Path(
        Path(__file__).parent.parent
        / f"data/{timestamp}-{player_model}-{player_count}-{world}-{density}-{radius}-{cpu}x{worker_total}"
    )
    dest.mkdir(exist_ok=True, parents=True)
    # write config file
    with open(dest / "config.toml", "w") as f:
        toml.dump(
            {
                "model": player_model,
                "player": player_count,
                "density": density,
                "radius": radius,
                "mob": mob,
            },
            f,
        )

    # copy config file to destination location
    shutil.copy(node_config, dest)

    # setup experiment
    wl.bots_per_node = player_count
    wl.bots_join_delay = timedelta(seconds=joinDelaySecs)
    wl.setup_new_experiment(player_model, radius, density)
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
    #shutdown to flush jfr data
    multipaper_worker.stop()
    # copy data files
    yardstick_benchmark.fetch(dest, master_node + worker_nodes + bot_nodes)
    # remove data files
    yardstick_benchmark.clean(master_node + worker_nodes + bot_nodes)
    # stop restart worker nodes to reset logs
    #multipaper_worker.restart()

    # removing node setup
    subprocess.run(["bash", "remove.sh"], cwd=subprocess_wd)
