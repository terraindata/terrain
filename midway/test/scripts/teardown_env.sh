#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

sqlite_path=${DIR}/../../../

if [ "$1" == "--sqlite-path" ];
then
	 sqlite_path=$2
	 shift
	 shift
fi

docker stop moviesdb-mysql && docker rm moviesdb-mysql
docker stop moviesdb-elk && docker rm moviesdb-elk

if [ -f ${sqlite_path} ] ; then
        echo "Deleting moviesdb sqlite database..."
        rm -f ${sqlite_path}/moviedb.db
fi
