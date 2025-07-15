#!/bin/bash


# program to get remote bot vms private keys for ansible

# ssh into physical remote and get remote_inventory file 
#ssh_com="ssh adaim@node6"
vagrant_dir="/mnt/sdc/adaim/yardstick/vagrant/"

# set config using python library yq
function set_config() {
	MASTER_MEMORY=$(cat multipaper.toml | tomlq .master.memory)
	MASTER_CPU=$(cat multipaper.toml | tomlq .master.cpu)

	WORKER_MEMORY=$(cat multipaper.toml | tomlq .worker.memory)

  WORKER_TOTAL=$(cat multipaper.toml | tomlq .worker.total)
  WORKER_CPU=$(cat multipaper.toml | tomlq .worker.cpu)
  #worker_cpus_str=$(cat multipaper.toml | tomlq .worker.cpu)
	#worker_totals_str=$(cat multipaper.toml | tomlq .worker.total)
	#worker_cpus_str=$(echo $worker_cpus_str | tr -d [ | tr -d ] | tr -d '\n' | tr -d ,)
	#worker_totals_str=$(echo $worker_totals_str | tr -d [ | tr -d ] | tr -d '\n' | tr -d ,)
	#IFS=',' read -r -a WORKER_CPUS <<<$worker_cpus_str
	#IFS=',' read -r -a WORKER_TOTALS <<<$worker_totals_str

	BOT_MEMORY=$(cat multipaper.toml | tomlq .bot.memory)
	BOT_CPU=$(cat multipaper.toml | tomlq .bot.cpu)
	BOT_TOTAL=$(cat multipaper.toml | tomlq .bot.total)
}

# get 80% memory for java program to run
function get_memory() {
	if [[ $1 == "master" ]]; then
		echo $(((MASTER_MEMORY * 80) / 100))
	elif [[ $1 == "worker" ]]; then
		echo $(((WORKER_MEMORY * 80) / 100))
	else
		echo $(((BOT_MEMORY * 80) / 100))
	fi
}

function create_remote_inventory_ssh(){
  ssh -c adaim@node6
  cd $vagrant_dir
  source ./remote_vanage
  create_remote_inventory_local
}

function create_remote_inventory_local(){
  OUTFILE="remote_inventory"
  >$OUTFILE
  
  VM_NAMES=$(VAGRANT_VAGRANTFILE=BotVagrantfile.rb vagrant status --machine-readable 2>>vagrant.log | grep ",state," | grep "running" | cut -d',' -f2 | sort -u)

  for VM in $VM_NAMES; do
      echo "VMs found in remote -- ${VM}  --"
			CONFIG=$(VAGRANT_VAGRANTFILE=BotVagrantfile.rb vagrant ssh-config $VM)

			HOSTNAME=$(echo "$CONFIG" | grep HostName | awk '{print $2}')
			USER=$(echo "$CONFIG" | grep "User " | awk '{print $2}')
			KEY=$(echo "$CONFIG" | grep IdentityFile | awk '{print $2}')

			# get vm name
			vmnum=$(echo "$VM" | sed 's/vm//')
      echo "[[bot]]" >>$OUTFILE
			echo -e "name='$VM'\nansible_host='${HOSTNAME}'\nansible_user='${USER}'\nansible_ssh_private_key_file='${KEY}'\nansible_ssh_common_args='-o IdentitiesOnly=yes -o StrictHostKeyChecking=no'\nwd='${VM}_$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 12 | head -n 1)'\nmemory='$(get_memory "bot")'\n\n" >>$OUTFILE
  done

  echo "===remote inventory created==="
  cat remote_inventory
  echo "===remote inventory created==="
}

# local test
function get_private_keys_local(){
  PRIVATE_KEYS=$(cat remote_inventory | grep 'ansible_ssh_private_key_file=' | sed -E "s/ansible_ssh_private_key_file='([^']+)'/\1/")
  for key_path in $PRIVATE_KEYS; do
    dest_path=$(echo "$key_path" | sed -E 's#^.*/\.vagrant/(.*)$#\1#')
    echo "Now copying ... $key_path to test/$dest_path"
    mkdir -p "test/$dest_path"
    cp $key_path "test/$dest_path"
  done
}

function copy_remote_inventory(){
  scp "adaim@node6:${vagrant_dir}remote_inventory" "./remote_inventory"
}

# run this from out of ssh (in client, not in remote)
function get_private_keys_remote(){
  # read copied remote_inventory and copy the keys to .vagrant/vagrant/machines/
  PRIVATE_KEYS=$(cat remote_inventory | grep 'ansible_ssh_private_key_file=' | sed -E "s/ansible_ssh_private_key_file='([^']+)'/\1/")
  for key_path in $PRIVATE_KEYS; do
    dest_path=$(echo "$key_path" | sed -E 's#^.*/(\.vagrant/.*)$#\1#')
    echo "Now copying ... $key_path to $dest_path"
    mkdir -p $dest_path
    scp "adaim@node6:$key_path" "./$dest_path"
  done
}

# no need to edit the contents of the inventory since it is the same
function append_remote_inv_to_inventory(){
  (cat inventory; cat remote_inventory) > inventory
}

copy_remote_inventory
append_remote_inv_to_inventory

