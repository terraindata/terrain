#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

mysql_port=3306
elastic_port=9200
sqlite_path=${DIR}/../../../

if [ "$1" == "--mysql-port" ];
then
	 mysql_port=$2
	 shift
	 shift
fi

if [ "$1" == "--elastic-port" ];
then
	 elastic_port=$2
	 shift
	 shift
fi

if [ "$1" == "--sqlite-path" ];
then
	 sqlite_path=$2
	 shift
	 shift
fi

if [ $(docker ps | grep 'terrain/moviesdb-mysql' | wc -l) != 0 ] ; then
        echo "Stopping moviesdb docker mysql image..."
        id=$(docker ps | grep "moviesdb-mysql" | grep $mysql_port"->3306" | awk '{ print $1 }')
        docker stop ${id} && docker rm ${id}
fi

if [ $(docker ps | grep 'terrain/moviesdb-elk' | wc -l) != 0 ] ; then
        echo "Stopping moviesdb docker elastic image..."
        id=$(docker ps | grep "moviesdb-elk" | grep $elastic_port"->9200" | awk '{ print $1 }')
        docker stop ${id} && docker rm ${id}
fi

if [ -f ${sqlite_path} ] ; then
        echo "Deleting moviesdb sqlite database..."
        rm -f ${sqlite_path}/moviedb.db
fi
