from datetime import timedelta, datetime
from time import sleep
from pathlib import Path
import sys

from yardstick_benchmark.provisioning import VagrantVMs
from yardstick_benchmark.games.minecraft.server import PaperMC
from yardstick_benchmark.monitoring import Telegraf

vagrant = VagrantVMs()
master_node = vagrant.get_vms_with_tag("master")
telegraf = Telegraf(master_node)


def deploy_paper():
    """
    world: sys.argv[1]
    """

    paper = PaperMC(master_node)

    world_name = sys.argv[1]
    world_path = Path(__file__).parent.parent.parent / f"worlds/{world_name}.zip"
    paper.set_world_as(world_path)

    paper.deploy()
    paper.start()

def start_paper_telegraf():
    telegraf.add_input_jolokia_agent(master_node[0])
    telegraf.add_input_execd_minecraft_ticks(master_node[0])
    telegraf.deploy()
    telegraf.start()

def stop_paper_telegraf():
    telegraf.stop()



