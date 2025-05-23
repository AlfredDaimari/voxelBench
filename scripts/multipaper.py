from yardstick_benchmark.provisioning import VagrantVMs
from yardstick_benchmark.games.minecraft.server import MultiPaper
from yardstick_benchmark.monitoring import Telegraf
from yardstick_benchmark.games.minecraft.workload import WalkAround
from datetime import timedelta
from time import sleep

vagrant = VagrantVMs()
master_node = vagrant.get_vms_with_tag("master")
worker_nodes = vagrant.get_vms_with_tag("worker")
bot_nodes = vagrant.get_vms_with_tag("bot")


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
