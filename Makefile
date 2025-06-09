setup:
	@echo "Running yardstick 2.0 benchmark"
	@cd vagrant && ./vanage.sh

test-mult:
	@echo "Setting up multipaper on running nodes"
	cd yard-python && poetry run dmult $(world)

test-bot:
	@echo "Deploying bot to cluster"
	cd yard-python && poetry run dmult-b

test-tel:
	@echo "Deploying telegraf monitoring to cluster"
	cd yard-python && poetry run dmult-t

# runs one bot to test walking workload (note the world should be the same as 
# one used to run test-deploy )
test-walkload:
	@echo "Running one bot locally against cluster"
	@{ \
	COORDS=$$(cd yard-python && poetry run mult-get-world_spawn $(world)); \
	SPAWN_X=$$(echo "$$COORDS" | jq -r '.spawn_x'); \
	SPAWN_Z=$$(echo "$$COORDS" | jq -r '.spawn_z'); \
	SPAWN_Y=$$(echo "$$COORDS" | jq -r '.spawn_y'); \
	echo "Setting SPAWN as $$SPAWN_X, $$SPAWN_Y , $$SPAWN_Z"; \
	cd yard-js && MC_HOST=$$(tomlq -r '.master[0].ansible_host' ../vagrant/inventory) BOTS_PER_NODE=1 RECORD=1 SPAWN_X=$$SPAWN_X SPAWN_Z=$$SPAWN_Z SPAWN_Y=$$SPAWN_Y HOSTNAME=local node master_bot.js; \
	}

test-pvp:
	@echo "Running two bots locally against cluster"
	@{ \
	COORDS=$$(cd yard-python && poetry run mult-get-world_spawn $(world)); \
	SPAWN_X=$$(echo "$$COORDS" | jq -r '.spawn_x'); \
	SPAWN_Z=$$(echo "$$COORDS" | jq -r '.spawn_z'); \
	SPAWN_Y=$$(echo "$$COORDS" | jq -r '.spawn_y'); \
	echo "Setting SPAWN as $$SPAWN_X, $$SPAWN_Y , $$SPAWN_Z"; \
	cd yard-js && MC_HOST=$$(tomlq -r '.master[0].ansible_host' ../vagrant/inventory) BOTS_PER_NODE=2 RECORD=1 SPAWN_X=$$SPAWN_X SPAWN_Z=$$SPAWN_Z SPAWN_Y=$$SPAWN_Y HOSTNAME=local WORKLOAD=pvp DURATION=120 DENSITY=2 node master_bot.js; \
	}

nodes-destroy:
	@cd vagrant && VAGRANT_VAGRANTFILE=MultVagrantfile.rb vagrant destroy -f
	@cd vagrant && VAGRANT_VAGRANTFILE=BotVagrantfile.rb vagrant destroy -f
