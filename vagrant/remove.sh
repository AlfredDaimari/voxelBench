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

set_config
VAGRANT_VAGRANTFILE=MultVagrantfile.rb vagrant destroy -f 
VAGRANT_VAGRANTFILE=BotVagrantfile.rb vagrant destroy -f
