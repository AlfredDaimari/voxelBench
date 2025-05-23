import yardstick_benchmark
from yardstick_benchmark.provisioning import VagrantVMs
from yardstick_benchmark.games.minecraft.server import MultiPaper
from yardstick_benchmark.monitoring import Telegraf
from yardstick_benchmark.games.minecraft.workload import WalkAround
from datetime import timedelta, datetime
from time import sleep
from pathlib import Path

vagrant = VagrantVMs()
master_node = vagrant.get_vms_with_tag("master")
worker_nodes = vagrant.get_vms_with_tag("worker")
bot_nodes = vagrant.get_vms_with_tag("bot")
telegraf = Telegraf(master_node + worker_nodes + bot_nodes)


def deploy_mult():
    multipaper_master = MultiPaper(master_node, worker_nodes, "master")
    multipaper_worker = MultiPaper(master_node, worker_nodes, "worker")

    multipaper_master.deploy()
    multipaper_master.start()
    multipaper_worker.deploy()
    multipaper_worker.start()


def deploy_bot():
    wl = WalkAround(
        bot_nodes, master_node[0].ansible_host, timedelta(seconds=120), bots_per_node=5
    )
    wl.deploy()
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
            datetime.now()
            .isoformat(timespec="minutes")
            .replace("-", "")
            .replace(":", "")
        )
    dest = Path(Path(__file__).parent.parent / f"data/{timestamp}")
    yardstick_benchmark.fetch(dest, master_node + worker_nodes + bot_nodes)


