if [[ $1 == "mult" ]]; then
  VAGRANT_VAGRANTFILE=MultVagrantfile.rb vagrant ssh $2
else
  VAGRANT_VAGRANTFILE=BotVagrantfile.rb vagrant ssh $2
fi
