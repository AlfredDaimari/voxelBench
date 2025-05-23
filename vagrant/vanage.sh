#!/bin/bash
#
# bash program to test multipaper using multipaper-test.toml

# utils
BLA_ball=('(●     )' '( ●    )' '(  ●   )' '(   ●  )' '(    ● )' '(     ●)' '(    ● )' '(   ●  )' '(  ●   )' '( ●    )' )
pstr=""
declare -a BLA_ball
declare -a pstr

BLA::play_loading_animation_loop() {
  while true ; do
    for frame in "${BLA_ball[@]}" ; do
      printf "\r%s %s %s" "${frame}" "--- ${pstr} ---" "${frame}"
      sleep 0.2
    done
  done
}

BLA::start_loading_animation() {
  tput civis # Hide the terminal cursor
  pstr="$1"
  BLA::play_loading_animation_loop &
  BLA_loading_animation_pid="${!}"
}

BLA::stop_loading_animation() {
  kill "${BLA_loading_animation_pid}" &> /dev/null
  printf "\n"
  tput cnorm # Restore the terminal cursor
}

# get current time
function log_dt()
{
  echo -e "[CET $(TIMEZONE='EUROPE/AMSTERDAM' date +'%F %T.%3N')] $1"
}

# install yq
function install_yq()
{
  yq_exists=$(python3 -c 'import pkgutil; print(1 if pkgutil.find_loader("yq") else 0)')

  if [ $yq_exists -eq 0 ]
  then
    pip install yq
  fi
}

# function that creates the inventory toml
# inventory toml is input for python program
function create_inventory_toml()
{
  OUTFILE="inventory"
  > $OUTFILE

  # Extract all defined VM names
  VM_NAMES=$(vagrant status --machine-readable | grep ",state," | cut -d',' -f2 | sort -u)
  for VM in $VM_NAMES; do
    CONFIG=$(vagrant ssh-config $VM)

    HOSTNAME=$(echo "$CONFIG" | grep HostName | awk '{print $2}')
    USER=$(echo "$CONFIG" | grep "User " | awk '{print $2}')
    KEY=$(echo "$CONFIG" | grep IdentityFile | awk '{print $2}')

    # get vm name
    vmnum=$(echo "$VM" | sed 's/vm//')
    WORKER_END=$((1+WORKER_TOTAL))

    # Write entry with VM name as the alias
    if [[ $vmnum -eq 1 ]]
    then
      echo "[master]" >> $OUTFILE
      echo -e "name='${VM}'\nansible_host='${HOSTNAME}'\nansible_user='${USER}'\nansible_ssh_private_key_file='${KEY}'\nansible_ssh_common_args='-o IdentitiesOnly=yes -o StrictHostKeyChecking=no'\nwd='${VM}_$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 12 | head -n 1)'\n\n" >> $OUTFILE
    elif [[ $vmnum -le $WORKER_END ]] && [[ $vmnum -gt 1 ]]
    then
      echo "[[worker]]" >> $OUTFILE
      echo -e "name='${VM}'\nansible_host='${HOSTNAME}'\nansible_user='${USER}'\nansible_ssh_private_key_file='${KEY}'\nansible_ssh_common_args='-o IdentitiesOnly=yes -o StrictHostKeyChecking=no'\nwd='${VM}_$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 12 | head -n 1)'\n\n" >> $OUTFILE
    else
      echo "[[bot]]" >> $OUTFILE
      echo -e "name='$VM'\nansible_host='${HOSTNAME}'\nansible_user='${USER}'\nansible_ssh_private_key_file='${KEY}'\nansible_ssh_common_args='-o IdentitiesOnly=yes -o StrictHostKeyChecking=no'\nwd='${VM}_$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 12 | head -n 1)'\n\n" >> $OUTFILE
    fi
    log_dt "... Processed $VM \U2714 ..."
  done
}


# set config using python library yq
function set_config()
{
  MASTER_MEMORY=$(cat multipaper.toml | tomlq .master.memory)
  MASTER_CPU=$(cat multipaper.toml | tomlq .master.cpu)

  WORKER_MEMORY=$(cat multipaper.toml | tomlq .worker.memory)
  
  worker_cpus_str=$(cat multipaper.toml | tomlq .worker.cpu)
  worker_totals_str=$(cat multipaper.toml | tomlq .worker.total)
  worker_cpus_str=$(echo $worker_cpus_str | tr -d [  | tr -d ] | tr -d '\n' | tr -d ,)
  worker_totals_str=$(echo $worker_totals_str | tr -d [  | tr -d ] | tr -d '\n' | tr -d ,)
  IFS=',' read -r -a WORKER_CPUS <<< $worker_cpus_str
  IFS=',' read -r -a WORKER_TOTALS <<< $worker_totals_str

  BOT_MEMORY=$(cat multipaper.toml | tomlq .bot.memory)
  BOT_CPU=$(cat multipaper.toml | tomlq .bot.cpu)
  BOT_TOTAL=$(cat multipaper.toml | tomlq .bot.total)
}

function create_vms()
{
  log_dt "... Setting Master Config ..."
  log_dt "memory=${MASTER_MEMORY}mb CPU=${MASTER_CPU}"
  export MASTER_MEMORY MASTER_CPU

  log_dt "... Setting BOT Config ..."
  log_dt "memory=${BOT_MEMORY}mb CPU=${BOT_CPU} Total=${BOT_TOTAL}"
  export BOT_MEMORY BOT_CPU BOT_TOTAL

  log_dt "... Setting Worker Config ..."
  log_dt "memory=${WORKER_MEMORY}mb CPU=$2 Total=$1"
  export WORKER_MEMORY WORKER_CPU=$2 WORKER_TOTAL=$1
  log_dt "... Creating VMs ..."
  BLA::start_loading_animation "vagrant is creating vms"
  vagrant up > vagrant.log
  BLA::stop_loading_animation 

  log_dt "... VMS Created: Now Creating Inventory TOML File ..."
  create_inventory_toml
  log_dt "... Invetory Created: Now running benchmark ..."
  # run the benchmark
  log_dt "... Benchmark Completed: Now destroying VMs ..."
  BLA::start_loading_animation "vagrant is destroying vms"
  #vagrant destroy -f >> vagrant.log
  BLA::stop_loading_animation
  echo -e "===x===x===x===x===x===x===x===x===x===x===x===x===x===x===\n\n\n\n\n"
}

# ansible-playbook -i inventory -t setup_master playbook-master.yaml
#  ansible-playbook -i inventory -t run_master playbook-master.yaml
#  ansible-playbook -i inventory -t setup_worker playbook-worker.yaml
#  ansible-playbook -i inventory -t run_worker playbook-worker.yaml
#  ansible-playbook -i inventory monitoring/master-bot-telegraf.yaml -e "config_template=$(pwd)/monitoring/telegraf.conf.j2"

install_yq
set_config
for total in $WORKER_TOTALS
do
  for cpu in $WORKER_CPUS
  do
    create_vms $total $cpu
  done
done

