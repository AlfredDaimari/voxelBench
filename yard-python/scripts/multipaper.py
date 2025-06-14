from datetime import timedelta, datetime
from time import sleep
from pathlib import Path
import sys

import yardstick_benchmark
from yardstick_benchmark.provisioning import VagrantVMs
from yardstick_benchmark.games.minecraft.server import MultiPaper
import yardstick_benchmark.games.minecraft.utils as mutils
from yardstick_benchmark.monitoring import Telegraf
from yardstick_benchmark.games.minecraft.workload import WalkAround
from yardstick_benchmark.monitoring import start_player_distribution_monitoring
from yardstick_benchmark.monitoring import stop_player_distribution_monitoring

vagrant = VagrantVMs()
master_node = vagrant.get_vms_with_tag("master")
worker_nodes = vagrant.get_vms_with_tag("worker")
bot_nodes = vagrant.get_vms_with_tag("bot")
telegraf = Telegraf(master_node + worker_nodes + bot_nodes)
wl = WalkAround(
    bot_nodes, master_node[0].ansible_host, timedelta(seconds=120), bots_per_node=5
)


def get_world_spawn_json():
    """
    Get the world spawn coordinates
    """
    coord = mutils.get_world_spawn(sys.argv[1])
    print('{ "spawn_x":%d, "spawn_y":%d, "spawn_z":%d }' % (coord.x, coord.y, coord.z))


def deploy_mult():
    """
    world: sys.argv[1]
    """
    multipaper_master = MultiPaper(master_node, worker_nodes, "master")
    multipaper_worker = MultiPaper(master_node, worker_nodes, "worker")

    world_name = sys.argv[1]
    world_path = Path(__file__).parent.parent.parent / f"worlds/{world_name}.zip"
    multipaper_master.set_world_as(world_path)

    multipaper_master.deploy()
    multipaper_master.start()
    multipaper_worker.deploy()
    multipaper_worker.start()


def stop_mult():
    """
    Stop running multipaper
    """
    multipaper_master = MultiPaper(master_node, worker_nodes, "master")
    multipaper_worker = MultiPaper(master_node, worker_nodes, "worker")

    multipaper_master.stop()
    multipaper_worker.stop()


def deploy_bot():
    """
    world: sys.argv[1]
    """
    wl.setup_recording_nodes(bot_nodes, 1)
    wl.deploy()


def start_bot():
    wl.setup_recording_nodes(bot_nodes)
    wl.start()
    sleep(120)


def start_telegraf():
    telegraf.add_input_jolokia_agent(bot_nodes[0])
    telegraf.add_input_execd_minecraft_ticks(bot_nodes[0])
    telegraf.deploy()
    telegraf.start()


def stop_telegraf():
    telegraf.stop()


def fetch():
    timestamp = (
        datetime.now().isoformat(timespec="minutes").replace("-", "").replace(":", "")
    )
    dest = Path(Path(__file__).parent.parent.parent / f"data/{timestamp}")
    yardstick_benchmark.fetch(dest, master_node + worker_nodes + bot_nodes)


def clean():
    yardstick_benchmark.clean(master_node + worker_nodes + bot_nodes)


def start_pdist_monitoring():
    start_player_distribution_monitoring(worker_nodes)

def stop_pdist_monitoring():
    stop_player_distribution_monitoring(worker_nodes)
