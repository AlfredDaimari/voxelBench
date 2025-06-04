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

nodes-destroy:
	@cd vagrant && VAGRANT_VAGRANTFILE=MultVagrantfile.rb vagrant destroy -f
	@cd vagrant && VAGRANT_VAGRANTFILE=BotVagrantfile.rb vagrant destroy -f
