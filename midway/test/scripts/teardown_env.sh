#!/bin/bash
mysql_port=3306
elastic_port=9200

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

if [ $(docker ps | grep 'terrain/moviesdb-mysql' | wc -l) != 0 ] ; then
        echo "Stopping moviesdb docker mysql image..."
        docker ps | grep "moviesdb-mysql" | grep $mysql_port"->3306" | awk '{ print $1 }' | xargs docker stop
fi

if [ $(docker ps | grep 'terrain/moviesdb-elk' | wc -l) != 0 ] ; then
        echo "Stopping moviesdb docker elastic image..."
        docker ps | grep "moviesdb-elk" | grep $elastic_port"->9200" | awk '{ print $1 }' | xargs docker stop
fi
