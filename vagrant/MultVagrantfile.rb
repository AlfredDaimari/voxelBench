# - * - mode: ruby - * -
# vi: set ft=ruby :

# Environment variables are set by vanage.sh
# And configured with multipaper.toml file
# File to create worker/master vms for multipaper

MASTER_MEMORY = ENV["MASTER_MEMORY"]&.to_i || 2048
WORKER_MEMORY = ENV["WORKER_MEMORY"]&.to_i || 2048
BOT_MEMORY = ENV["BOT_MEMORY"]&.to_i || 2048
MASTER_CPU = ENV["MASTER_CPU"]&.to_i || 1
WORKER_CPU = ENV["WORKER_CPU"]&.to_i || 1
BOT_CPU = ENV["BOT_CPU"]&.to_i || 1
BOT_TOTAL = ENV["BOT_TOTAL"]&.to_i || 1
WORKER_TOTAL = ENV["WORKER_TOTAL"]&.to_i || 1
WORKER_START = 2
WORKER_END = WORKER_START + WORKER_TOTAL - 1
BOT_START = WORKER_END + 1
BOT_END = BOT_START + BOT_TOTAL - 1

Vagrant.configure("2") do |config|
  config.vm.box = "generic/ubuntu2204"
  config.timezone.value = :host
  # master vm
  config.vm.define "vm1" do |vm1|
    vm1.vm.hostname = "vm1"

    # this is for @large cluster testing
    vm1.vm.network :public_network,
         dev: "br0",
         type: "bridge",
         ip: "192.168.1.101"

    vm1.vm.provider :libvirt do |libvirt|
      libvirt.default_prefix = ""
      libvirt.memory = MASTER_MEMORY
      libvirt.cpus = MASTER_CPU
      libvirt.storage :file,
                      path: "disk_vm1.qcow2",
                      size: "10G",
                      type: "qcow2",
                      allow_existing: true
    end
  end

  # worker vms
  (WORKER_START..WORKER_END).each do |i|
    config.vm.define "vm#{i}" do |vm|
      vm.vm.hostname = "vm#{i}"

      # this is for @large cluster testing
      vm.vm.network :public_network,
         dev: "br0",
         type: "bridge",
         ip: "192.168.1.#{100 + i}"

      vm.vm.provider :libvirt do |libvirt|
        libvirt.default_prefix = ""
        libvirt.memory = WORKER_MEMORY
        libvirt.cpus = WORKER_CPU
        libvirt.storage :file,
                        path: "disk_vm#{i}.qcow2",
                        size: "10G",
                        type: "qcow2",
                        allow_existing: true
      end
    end
  end
end
