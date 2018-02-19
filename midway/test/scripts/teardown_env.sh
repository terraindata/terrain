#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

sqlite_path=${DIR}/../../../
use_mysql=1
use_postgres=1
use_elastic=1
use_sqlite=1
use_chrome=1

function usage {
	 echo "Help!"
}

while [ -n "$1" ];
do
	 case "$1" in
		  --help)
				usage
				exit 0
				;;
		  --use-mysql=*)
				use_mysql="${1#*=}"
				;;
		  --use-postgres=*)
				use_postgres="${1#*=}"
				;;
		  --use-elastic=*)
				use_elastic="${1#*=}"
				;;
		  --sqlite-path)
				sqlite_path=$2
				shift
				;;
		  --sqlite-path=*)
				sqlite_path="${1#*=}"
				;;
		  --use-sqlite=*)
				use_sqlite="${1#*=}"
				;;
		  --use-chrome=*)
				use_chrome="${1#*=}"
				;;
		  --*)
				echo "Unknown option: $1" 1>&2
				exit 1
				;;
		  *)
				echo "Unknown option: $1" 1>&2
				exit 1
				;;
	 esac
	 shift
done

if [ "$use_mysql" == 1 ] && [ $(docker ps -aq -f name=moviesdb-mysql | wc -l) != 0 ] ; then
        echo "Stopping moviesdb docker mysql image..."
        docker stop moviesdb-mysql
        docker rm moviesdb-mysql || true
fi

if [ "$use_postgres" == 1 ] && [ $(docker ps -aq -f name=moviesdb-postgres | wc -l) != 0 ] ; then
        echo "Stopping moviesdb docker postgres image..."
        docker stop moviesdb-postgres
        docker rm moviesdb-postgres || true
fi

if [ "$use_elastic" == 1 ] && [ $(docker ps -aq -f name=moviesdb-elk | wc -l) != 0 ] ; then
        echo "Stopping moviesdb docker elk image..."
        docker stop moviesdb-elk
        docker rm moviesdb-elk || true
fi

if [ "$use_chrome" == 1 ] && [ $(docker ps -aq -f name=chrome | wc -l) != 0 ] ; then
        echo "Stopping headless Chrome docker image..."
        docker stop chrome
        docker rm chrome || true
fi

if [ "$use_sqlite" == 1 ] && [ -f ${sqlite_path} ] ; then
        echo "Deleting moviesdb sqlite database..."
        rm -f ${sqlite_path}/moviedb.db
fi
