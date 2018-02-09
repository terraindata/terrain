#!/bin/bash

# Run this from Search/midway/migrations

if [ -d ../../../PersistentVolumes/midway-postgres-data ]; then
    # do nothing
    echo "Target directory already exists, doing nothing...";
else
    sudo mv ../../postgres-data ../../../PersistentVolumes/midway-postgres-data
fi
