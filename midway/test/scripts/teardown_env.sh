#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

sqlite_path=${DIR}/../../../

if [ "$1" == "--sqlite-path" ];
then
	 sqlite_path=$2
	 shift
	 shift
fi

if [ $(docker ps -aq -f name=moviesdb-mysql | wc -l) != 0 ] ; then
        echo "Stopping moviesdb docker mysql image..."
        docker stop moviesdb-mysql
        docker rm moviesdb-mysql || true
fi

if [ $(docker ps -aq -f name=moviesdb-elk | wc -l) != 0 ] ; then
        echo "Stopping moviesdb docker elk image..."
        docker stop moviesdb-elk
        docker rm moviesdb-elk || true
fi

if [ -f ${sqlite_path} ] ; then
        echo "Deleting moviesdb sqlite database..."
        rm -f ${sqlite_path}/moviedb.db
fi
