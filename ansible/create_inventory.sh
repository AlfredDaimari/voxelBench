#!/bin/bash

OUTFILE="inventory"
SERVERARGS=""
ARGSLENGTH=0
MASTER=""
worker=""
bot=""

# fresh start
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

  # Write entry with VM name as the alias
  if [[ $vmnum -eq 1 ]]
  then
    echo "[master]" >> $OUTFILE
    MASTER=$HOSTNAME
    echo -e "$VM ansible_host=$HOSTNAME ansible_user=$USER ansible_ssh_private_key_file=$KEY ansible_ssh_common_args='-o IdentitiesOnly=yes -o StrictHostKeyChecking=no' wd=${VM}_$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 12 | head -n 1)\n" >> $OUTFILE

  elif [[ $vmnum -lt 4 ]] && [[ $vmnum -ge 1 ]]
  then
    SERVERARGS="${SERVERARGS}$HOSTNAME $VM "
    ARGSLENGTH=$((ARGSLENGTH + 2))
    worker="$VM ansible_host=$HOSTNAME ansible_user=$USER ansible_ssh_private_key_file=$KEY ansible_ssh_common_args='-o IdentitiesOnly=yes -o StrictHostKeyChecking=no' wd=${VM}_$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 12 | head -n 1)\n$worker"
  else
    bot="$VM ansible_host=$HOSTNAME ansible_user=$USER ansible_ssh_private_key_file=$KEY ansible_ssh_common_args='-o IdentitiesOnly=yes -o StrictHostKeyChecking=no' wd=${VM}_$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 12 | head -n 1)\n$bot"
  fi
  echo -e "Processed $VM ... \U2714"
done

echo "[worker]" >> $OUTFILE
echo -e "$worker" >> $OUTFILE
echo "[bot]" >> $OUTFILE
echo -e "$bot" >> $OUTFILE
echo -e "Ansible inventory written to $OUTFILE \U1F44D"

SERVERARGS=$(echo "$SERVERARGS" | xargs )
echo "[master:vars]" >> $OUTFILE
echo "servers=\"$SERVERARGS\"" >> $OUTFILE
# need to also write down length because ansible does not allow the length command in bash
echo "length=$ARGSLENGTH" >> $OUTFILE
echo -e "Written velocity.toml master server vars to $OUTFILE \U1F44D"
echo -e "\n" >> $OUTFILE
echo "[worker:vars]" >> $OUTFILE
echo "master=$MASTER" >> $OUTFILE
echo -e "Written velocity.toml worker server vars to $OUTFILE \U1F44D"

