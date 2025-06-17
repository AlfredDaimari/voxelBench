# set config using python library yq
function set_config() {
	export MASTER_MEMORY=$(cat multipaper.toml | tomlq .master.memory)
	export MASTER_CPU=$(cat multipaper.toml | tomlq .master.cpu)

	export WORKER_MEMORY=$(cat multipaper.toml | tomlq .worker.memory)

  export WORKER_TOTAL=$(cat multipaper.toml | tomlq .worker.total)
  export WORKER_CPU=$(cat multipaper.toml | tomlq .worker.cpu)
  #worker_cpus_str=$(cat multipaper.toml | tomlq .worker.cpu)
	#worker_totals_str=$(cat multipaper.toml | tomlq .worker.total)
	#worker_cpus_str=$(echo $worker_cpus_str | tr -d [ | tr -d ] | tr -d '\n' | tr -d ,)
	#worker_totals_str=$(echo $worker_totals_str | tr -d [ | tr -d ] | tr -d '\n' | tr -d ,)
	#IFS=',' read -r -a WORKER_CPUS <<<$worker_cpus_str
	#IFS=',' read -r -a WORKER_TOTALS <<<$worker_totals_str

	export BOT_MEMORY=$(cat multipaper.toml | tomlq .bot.memory)
	export BOT_CPU=$(cat multipaper.toml | tomlq .bot.cpu)
	export BOT_TOTAL=$(cat multipaper.toml | tomlq .bot.total)
}

set_config
VAGRANT_VAGRANTFILE=MultVagrantfile.rb vagrant destroy -f 
VAGRANT_VAGRANTFILE=BotVagrantfile.rb vagrant destroy -f
