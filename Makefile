run:
	@echo "Running yardstick 2.0 benchmark"
	@cd vagrant && ./vanage.sh

test-deploy:
	@echo "Setting up multipaper on running nodes"
	cd yard-python && poetry run dmult $(world)

test-deploy-bot:
	@echo "Deploying bot to cluster"
	cd yard-python && poetry run dmult-b

test-deploy-tel:
	@echo "Deploying telegraf monitoring to cluster"
	cd yard-python && poetry run dmult-t

# runs one bot to test walking workload (note the world should be the same as 
# one used to run test-deploy )
test-run-walkload:
	@echo "Running two bots locally against cluster"
	cd yard-js && MC_HOST=$$(tomlq -r '.master[0].ansible_host' ../vagrant/inventory) COORDS=$$(cd ../yard-python && poetry run mult-get-world_spawn $(world)) BOTS_PER_NODE=2 RECORD=1 node walkaround_bot.js

nodes-destroy:
	@cd vagrant && VAGRANT_VAGRANTFILE=MultVagrantfile.rb vagrant destroy -f
	@cd vagrant && VAGRANT_VAGRANTFILE=BotVagrantfile.rb vagrant destroy -f
