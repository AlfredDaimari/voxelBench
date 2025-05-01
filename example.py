from yardstick_benchmark.model import Node, NodeVagrant, get_all_nodes,get_worker_nodes
from yardstick_benchmark.provisioning import Das
from yardstick_benchmark.monitoring import Telegraf
from yardstick_benchmark.games.minecraft.server import PaperMC
from yardstick_benchmark.games.minecraft.workload import WalkAround
import yardstick_benchmark
from time import sleep
from datetime import datetime
from pathlib import Path
import os

if __name__ == "__main__":

    ### DEPLOYMENT ENVIRONMENT ###

    # The DAS compute cluster is a medium-sized cluster for research and education.
    # We use it in this example to provision bare-metal machines to run our performance
    # evaluation.
    # das = Das()
    # We reserve 2 nodes.
    # nodes = das.provision(num=2)
    nodes = [NodeVagrant(node) for node in get_worker_nodes()]

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
        wl = WalkAround(all_nodes[3:], nodes[0].host, bots_per_node=20)
        wl.deploy()
        wl.start()

        sleep_time = 50
        print(f"sleeping for {sleep_time} seconds")
        sleep(sleep_time)

        #papermc.stop()
        #papermc.cleanup()

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
    finally:
        #yardstick_benchmark.clean(nodes)
        #das.release(nodes)
        print()
