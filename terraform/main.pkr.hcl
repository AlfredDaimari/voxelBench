packer {
  required_plugins {
    googlecompute = {
      source = "github.com/hashicorp/googlecompute"
      version = ">= 1.0.0"
    }
  }
}

variable "project" {
  type = string
  description = "GCP project ID"
}

variable "region" {
  default = "us-central1"
}

source "googlecompute" "voxelBench" {
  project_id = var.project
  source_image_family = "debian-11"
  zone = "${var.region}-c"
  image_name = "voxelbench-debian-11-{{timestamp}}"
  machine_type = "n2-standard-2"
  ssh_username = "alfred"

  metadata = {}
}

build {
  sources = ["source.googlecompute.voxelBench"]
  provisioner "shell" {
    inline = [
    "echo '---for-updates---'",
    "sudo apt-get update",
    "sudo apt install -y software-properties-common",
    "sudo apt-get install -y htop",
    "sudo apt-get install -y git",
    "DEBIAN_FRONTEND=noninteractive sudo apt-get install -y --no-install-recommends build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev liblzma-dev python3-openssl",
    "sudo apt install -y make",
    ] 
  }

  provisioner "shell" {
    inline = [
    "echo '---for-libvirt---'",
    "sudo apt-get install -y build-essential libffi-dev libgmp-dev ruby-dev qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virtinst virt-manager libguestfs-tools libvirt-dev",
    "sudo usermod -aG libvirt,libvirt-qemu,kvm alfred",
    ] 
  }
   

  provisioner "shell" {
    inline = [
    "echo '---for-vagrant---'",
    "echo \"deb [trusted=yes] https://apt.releases.hashicorp.com $(lsb_release -cs) main\" > /tmp/hashicorp.list",
    "sudo mv /tmp/hashicorp.list /etc/apt/sources.list.d/hashicorp.list",
    "sudo apt-get update",
    "sudo apt-get install -y vagrant",
    "vagrant plugin install vagrant-libvirt",
    "vagrant plugin install vagrant-timezone",
    "vagrant box add generic/ubuntu2204 --provider libvirt --force",
    ] 
  }

provisioner "shell" {
    inline = [
    "echo '---for-python---'",
    "curl https://pyenv.run | bash",
    "export PYENV_ROOT=\"$HOME/.pyenv\"",
    "export PATH=\"$PYENV_ROOT/bin:$PATH\"",
    "eval \"$(pyenv init --path)\"",
    "eval \"$(pyenv init -)\"",
    "pyenv install 3.12.0",
    "pyenv global 3.12.0",
    "pip install --upgrade pip setuptools wheel",
    "echo '# Pyenv initialization' >> /home/alfred/.bashrc",
    "echo 'export PYENV_ROOT=\"$HOME/.pyenv\"' >> /home/alfred/.bashrc",
    "echo 'export PATH=\"$PYENV_ROOT/bin:$PATH\"' >> /home/alfred/.bashrc",
    "echo 'eval \"$(pyenv init --path)\"' >> /home/alfred/.bashrc",
    "echo 'eval \"$(pyenv init -)\"' >> /home/alfred/.bashrc",
    ] 
  }
}
