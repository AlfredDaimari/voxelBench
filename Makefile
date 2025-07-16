setup:
	@echo "Setting up nodes for voxelBench"
	@cd vagrant && ./vanage.sh

test-mult:
	@echo "Setting up multipaper on running nodes"
	cd yard-python && poetry run dmult $(world)

test-mult-stop:
	@echo "Stopping multipaper"
	cd yard-python && poetry run smult 

test-bot:
	@echo "Deploying bot to cluster"
	cd yard-python && poetry run dmult-b

test-tel:
	@echo "Deploying telegraf monitoring to cluster"
	cd yard-python && poetry run dmult-t

test-tel-stop:
	@echo "Stopping telegraph"
	cd yard-python && poetry run smult-t

# runs one bot to test walking workload (note the world should be the same as 
# one used to run test-deploy )
test-walkload:
	@echo "Running 10 bots locally against cluster"
	@{ \
	COORDS=$$(cd yard-python && poetry run mult-get-world_spawn $(world)); \
	SPAWN_X=$$(echo "$$COORDS" | jq -r '.spawn_x'); \
	SPAWN_Z=$$(echo "$$COORDS" | jq -r '.spawn_z'); \
	SPAWN_Y=$$(echo "$$COORDS" | jq -r '.spawn_y'); \
	echo "Setting SPAWN as $$SPAWN_X, $$SPAWN_Y, $$SPAWN_Z"; \
	cd yard-js && MC_HOST=$$(tomlq -r '.master[0].ansible_host' ../vagrant/inventory) BOTS_PER_NODE=10 RECORD=0 SPAWN_X=$$SPAWN_X SPAWN_Z=$$SPAWN_Z SPAWN_Y=$$SPAWN_Y HOSTNAME=local DENSITY=2 DURATION=120 node master_bot.js; \
	}

test-pvp:
	@echo "Running 4 bots locally against cluster"
	@{ \
	COORDS=$$(cd yard-python && poetry run mult-get-world_spawn $(world)); \
	SPAWN_X=$$(echo "$$COORDS" | jq -r '.spawn_x'); \
	SPAWN_Z=$$(echo "$$COORDS" | jq -r '.spawn_z'); \
	SPAWN_Y=$$(echo "$$COORDS" | jq -r '.spawn_y'); \
	echo "Setting SPAWN as $$SPAWN_X, $$SPAWN_Y, $$SPAWN_Z"; \
	cd yard-js && MC_HOST=$$(tomlq -r '.master[0].ansible_host' ../vagrant/inventory) BOTS_PER_NODE=4 RECORD=0 SPAWN_X=$$SPAWN_X SPAWN_Z=$$SPAWN_Z SPAWN_Y=$$SPAWN_Y HOSTNAME=local WORKLOAD=pvp DURATION=120 DENSITY=2 node master_bot.js; \
	}

test-pve:
	@echo "Running 4 bots sparsely and locally against cluster"
	@{ \
	COORDS=$$(cd yard-python && poetry run mult-get-world_spawn $(world)); \
	SPAWN_X=$$(echo "$$COORDS" | jq -r '.spawn_x'); \
	SPAWN_Z=$$(echo "$$COORDS" | jq -r '.spawn_z'); \
	SPAWN_Y=$$(echo "$$COORDS" | jq -r '.spawn_y'); \
	PVE_MOB=$$(tomlq -r '.benchmark.pve_mob' vagrant/multipaper.toml); \
	echo "Setting SPAWN as $$SPAWN_X, $$SPAWN_Y, $$SPAWN_Z"; \
	cd yard-js && MC_HOST=$$(tomlq -r '.master[0].ansible_host' ../vagrant/inventory) BOTS_PER_NODE=4 RECORD=0 SPAWN_X=$$SPAWN_X SPAWN_Z=$$SPAWN_Z SPAWN_Y=$$SPAWN_Y HOSTNAME=local WORKLOAD=pve DURATION=120 DENSITY=1 PVE_MOB=$$PVE_MOB node master_bot.js; \
	}

test-build:
	@echo "Running 4 bots sparsely and locally against cluster"
	@{ \
	COORDS=$$(cd yard-python && poetry run mult-get-world_spawn $(world)); \
	SPAWN_X=$$(echo "$$COORDS" | jq -r '.spawn_x'); \
	SPAWN_Z=$$(echo "$$COORDS" | jq -r '.spawn_z'); \
	SPAWN_Y=$$(echo "$$COORDS" | jq -r '.spawn_y'); \
	PVE_MOB=$$(tomlq -r '.benchmark.pve_mob' vagrant/multipaper.toml); \
	echo "Setting SPAWN as $$SPAWN_X, $$SPAWN_Y, $$SPAWN_Z"; \
	cd yard-js && MC_HOST=$$(tomlq -r '.master[0].ansible_host' ../vagrant/inventory) BOTS_PER_NODE=4 RECORD=0 SPAWN_X=$$SPAWN_X SPAWN_Z=$$SPAWN_Z SPAWN_Y=$$SPAWN_Y HOSTNAME=local WORKLOAD=build DURATION=300 DENSITY=1 PVE_MOB=$$PVE_MOB node master_bot.js; \
	}


test-fetch:
	@echo "Fetching data"
	cd yard-python && poetry run mult-fetch

test-clean:
	@echo "Cleaning up data"
	cd yard-python && poetry run mult-clean

nodes-destroy:
	@cd vagrant && bash remove.sh

build-chunkLogger:
	@cd java && mvn clean package
	mv java/target/ChunkLogger-1.0.jar yard-python/yardstick_benchmark/games/minecraft/plugins/

run-mult-bench:
	@echo "Running VoxelBench Multipaper"
	@{ \
		export MASTER_MEMORY=$$(cat vagrant/multipaper.toml | tomlq .master.memory); \
		export MASTER_CPU=$$(cat vagrant/multipaper.toml | tomlq .master.cpu); \
		export WORKER_MEMORY=$$(cat vagrant/multipaper.toml | tomlq .worker.memory); \
		export WORKER_TOTAL=$$(cat vagrant/multipaper.toml | tomlq .worker.total); \
		export WORKER_CPU=$$(cat vagrant/multipaper.toml | tomlq .worker.cpu); \
		export BOT_MEMORY=$$(cat vagrant/multipaper.toml | tomlq .bot.memory); \
		export BOT_CPU=$$(cat vagrant/multipaper.toml | tomlq .bot.cpu); \
		export BOT_TOTAL=$$(cat vagrant/multipaper.toml | tomlq .bot.total); \
		cd yard-python && poetry run python3 run_benchmark.py; \
		}
