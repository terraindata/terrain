#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# this is the tagged version of moviedb docker image we are using
deploy_version=1.0a
elastic_image="terrain/moviesdb-elk:$deploy_version"
mysql_image="terrain/moviesdb-mysql:$deploy_version"
sqlite_image="terrain/moviesdb-sqlite:$deploy_version"

mysql_port=3306
elastic_port=9200
sqlite_path=$(pwd)

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
		  --mysql-port)
				mysql_port=$2
				shift
				;;
		  --mysql-port=*)
				mysql_port="${1#*=}"
				;;
		  --elastic-port)
				elastic_port=$2
				shift
				;;
		  --elastic-port=*)
				elastic_port="${1#*=}"
				;;
		  --sqlite-path)
				sqlite_path=$2
				shift
				;;
		  --sqlite-path=*)
				sqlite_path="${1#*=}"
				;;
		  --version)
				echo "Elastic: $elastic_image MySQL: $mysql_image SQLite: $sqlite_image"
				exit 0
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

# stop any existing instances

if [ "$mysql_port" == 3306 ];
then
	 echo "Starting mysql on port $mysql_port..."
else
	 echo "Starting mysql on NON-STANDARD port $mysql_port..."
fi

if [ "$elastic_port" == 9200 ];
then
	 echo "Starting elastic on port $elastic_port..."
else
	 echo "Starting elastic on NON-STANDARD port $elastic_port..."
fi

${DIR}/teardown_env.sh --mysql-port=$mysql_port --elastic-port=$elastic_port

docker pull $mysql_image
docker run -d -p $mysql_port:3306 $mysql_image

docker pull $elastic_image
docker run -d -p $elastic_port:9200 $elastic_image

