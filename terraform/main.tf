terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  credentials = file("creds.json")
  project     = var.project
  region      = var.region
}

variable "project" {}

variable "region" {
  default = "us-central1"
}

resource "google_compute_instance" "voxelBench" {
  name         = "bench-vm"
  machine_type = "n4-highmem-80"
  zone         = "${var.region}-c"

  advanced_machine_features {
    enable_nested_virtualization = true
  }

  boot_disk {
    initialize_params {
      image = "voxelbench-debian-11-1754605286"
      size = 350
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata_startup_script = <<-EOT
  #!/bin/bash
  set -x

  # Install htop, mount voxel disk
  sudo mkdir -p /mnt/voxel
  sudo mount /dev/disk/by-id/google-hyperdisk-voxel-bench /mnt/voxel
  sudo chown alfred:alfred /mnt/voxel/yardstick
  sudo chown alfred:alfred /mnt/voxel/yardstick/*
  
  EOT
}

resource "google_compute_attached_disk" "attach_voxel_disk" {
  disk     = "hyperdisk-voxel-bench"
  instance = google_compute_instance.voxelBench.name
  zone     = google_compute_instance.voxelBench.zone
  device_name = "hyperdisk-voxel-bench"
}
