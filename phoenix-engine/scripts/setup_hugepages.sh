#!/bin/bash
# Allocate 2GB huge pages
echo 1024 > /proc/sys/vm/nr_hugepages
mkdir -p /mnt/huge
mount -t hugetlbfs nodev /mnt/huge
echo "Huge pages allocated and mounted at /mnt/huge"
