from yardstick_benchmark.model import Node, NodeVagrant, get_all_nodes, get_master_host,get_worker_nodes
from yardstick_benchmark.provisioning import Das
from yardstick_benchmark.monitoring import Telegraf
from yardstick_benchmark.games.minecraft.server import PaperMC
from yardstick_benchmark.games.minecraft.workload import WalkAround
import yardstick_benchmark
from time import sleep
from datetime import datetime, timedelta
from pathlib import Path
import os
import shutil
import threading

if __name__ == "__main__":

    ### DEPLOYMENT ENVIRONMENT ###

    # The DAS compute cluster is a medium-sized cluster for research and education.
    # We use it in this example to provision bare-metal machines to run our performance
    # evaluation.
    # das = Das()
    # We reserve 2 nodes.
    # nodes = das.provision(num=2)
    nodes = [NodeVagrant(node) for node in get_worker_nodes()]
    bots_per_node=20

    try:
        # Just in case, we remove data that may have been left from a previous run.
        #yardstick_benchmark.clean(nodes)

        ### METRICS ###

        # # Telegraf (https://www.influxdata.com/time-series-platform/telegraf/)
        # # is the metric collection tool we use to collect performance metrics from the
        # # nodes and any applications deployed on these nodes.
        telegraf = Telegraf(nodes)
        # # We plan to deploy our Minecraft-like game server on node 0.
        # # To obtain application level metrics from the game server,
        # # the next two lines configure node 0 to run additional metric collection
        # # tools.
        
        for node in nodes:
            telegraf.add_input_jolokia_agent(node)
            telegraf.add_input_execd_minecraft_ticks(node)
        
        # # Perform the actual deployment of Telegraf.
        # # This includes downloading the Telegraf executable and preparing configuration
        # # files.
        res = telegraf.deploy()
        # # Start Telegraf on all remote nodes.
        telegraf.start()

        ### System Under Test (SUT) ###

        # PaperMC (https://papermc.io/) is the Minecraft-like game whose performance
        # we'll evaluate in this example.
        # We pass a list with all the nodes on which we want to deploy a server.
        # In this example, we only deploy a server on node 0.
        #papermc = PaperMC(nodes[:1])
        # We perform the deployment, including downloading the game executable JAR and
        # correctly configuring the game's configuration file.
        #papermc.deploy()
        # We start the game server.
        #papermc.start()

        ### WORKLOAD ###

        all_nodes = [ NodeVagrant(node) for node in get_all_nodes()]
        wl = WalkAround(all_nodes[3:], nodes[0].host, bots_per_node=bots_per_node, duration=timedelta(minutes=1))
        wl.deploy()
        yardstick_benchmark.start_sysstat_master(all_nodes[:1])
        wl.start()
   
        # Run total player count before sleep
        sleep_time = 60 * 1
        master_host = get_master_host()
        thread = threading.Thread(target=yardstick_benchmark.query_players, args=(master_host,sleep_time))

        print(f"sleeping for {sleep_time} seconds")
        thread.start()
        sleep(sleep_time)
        thread.join()

        #papermc.stop()
        #papermc.cleanup()

        yardstick_benchmark.stop_sysstat_master(all_nodes[:1])
        telegraf.stop()
        telegraf.cleanup()

        timestamp = (
            datetime.now()
            .isoformat(timespec="minutes")
            .replace("-", "")
            .replace(":", "")
        )
        # now fetch from each node instead
        dest = Path(f"/home/{os.getlogin()}/yardstick/{timestamp}")
        yardstick_benchmark.fetch(dest, nodes)
        yardstick_benchmark.fetch_master(dest, all_nodes[:1])
        yardstick_benchmark.fetch_master_bot_telegraf(dest, all_nodes)
        #yardstick_benchmark.fetch_bot(dest, all_nodes[3:])

        # copy vm.toml file also to dest
        vm_src = f"{os.getcwd()}/ansible/vm.toml"
        shutil.copy(vm_src, dest / "vm.toml")
        shutil.move('./player_count.log', dest / 'player_count.log')
        
        # write the bots per node setting
        with open(f"/home/{os.getlogin()}/yardstick/{timestamp}/vm.toml", "a") as f:
            f.write(f"\n[bots_per_node]\n{bots_per_node}\n")

    finally:
        #yardstick_benchmark.clean(nodes)
        #das.release(nodes)
        print()
