#!/bin/bash
#
# bash program to create vms defined in vm.toml using vagrant and 
# subsequent inventory file, also setup master and worker nodes

# install yq to set toml variables as environment variables
yq_exists=$(python3 -c 'import pkgutil; print(1 if pkgutil.find_loader("yq") else 0)')

if [ $yq_exists -eq 0 ]
then
  pip install yq
fi

# set and export master environment variables
export MASTER_MEMORY=$(cat vm.toml | tomlq .master.memory)
export MASTER_CPU=$(cat vm.toml | tomlq .master.cpu)

# set and export worker environment variables
export WORKER_MEMORY=$(cat vm.toml | tomlq .worker.memory)
export WORKER_CPU=$(cat vm.toml | tomlq .worker.cpu)
export WORKER_TOTAL=$(cat vm.toml | tomlq .worker.total)

# set and export bot environment variables
export BOT_MEMORY=$(cat vm.toml | tomlq .bot.memory)
export BOT_CPU=$(cat vm.toml | tomlq .bot.cpu)
export BOT_TOTAL=$(cat vm.toml | tomlq .bot.total)

echo "Performing vanage $1"
if [ "$1" == "create" ]
then
  vagrant up
  ./inventory.sh
  ansible-playbook -i inventory -t setup_master playbook-master.yaml
  ansible-playbook -i inventory -t run_master playbook-master.yaml
  ansible-playbook -i inventory -t setup_worker playbook-worker.yaml
  ansible-playbook -i inventory -t run_worker playbook-worker.yaml
else
  vagrant destroy
fi
