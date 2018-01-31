#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# this is the tagged version of moviedb docker image we are using
deploy_version=1.0a
elastic_image="terrain/moviesdb-elk:$deploy_version"
mysql_image="terrain/moviesdb-mysql:$deploy_version"
postgres_image="terrain/moviesdb-postgres:$deploy_version"
sqlite_image="terrain/moviesdb-sqlite:$deploy_version"
chrome_image="yukinying/chrome-headless-browser"

orig_mysql_port=3306
orig_postgres_port=5432
orig_elastic_port=9200

mysql_port=63306
postgres_port=65432
elastic_port=9200
chrome_port=9222

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
		  --mysql-port)
				mysql_port=$2
				shift
				;;
		  --mysql-port=*)
				mysql_port="${1#*=}"
				;;
		  --use-mysql=*)
				use_mysql="${1#*=}"
				;;
		  --postgres-port)
				postgres_port=$2
				shift
				;;
		  --postgres-port=*)
				postgres_port="${1#*=}"
				;;
		  --use-postgres=*)
				use_postgres="${1#*=}"
				;;
		  --elastic-port)
				elastic_port=$2
				shift
				;;
		  --elastic-port=*)
				elastic_port="${1#*=}"
				;;
		  --use-elastic=*)
				use_elastic="${1#*=}"
				;;
		  --use-chrome=*)
				use_chrome="${1#*=}"
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
		  --version)
				echo "Elastic: $elastic_image MySQL: $mysql_image Postgres: $postgres_image SQLite: $sqlite_image"
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
${DIR}/teardown_env.sh --use-mysql=${use_mysql} --use-postgres=${use_postgres} --use-elastic=${use_elastic} --use-chrome=${use_chrome} --use-sqlite=${use_sqlite}

if [ "$use_mysql" == 1 ];
then
    if [ "$mysql_port" == "$orig_mysql_port" ];
    then
        echo "Starting mysql on port $mysql_port..."
    else
        echo "Starting mysql on NON-STANDARD port $mysql_port..."
    fi
fi

if [ "$use_postgres" == 1 ];
then
    if [ "$postgres_port" == "$orig_postgres_port" ];
    then
        echo "Starting Postgres on port $postgres_port..."
    else
        echo "Starting Postgres on NON-STANDARD port $postgres_port..."
    fi
fi

if [ "$use_elastic" == 1 ];
then
    if [ "$elastic_port" == "$orig_elastic_port" ];
    then
    	 echo "Starting elastic on port $elastic_port..."
    else
    	 echo "Starting elastic on NON-STANDARD port $elastic_port..."
    fi
fi

if [ "$use_chrome" == 1 ];
then
    echo "Starting the headless Chrome on port $chrome_port...";
fi

# Pull images in parallel in order to minimize latency...
if [ "$use_sqlite" == 1 ]; then
    docker pull $sqlite_image &
fi
if [ "$use_mysql" == 1 ]; then
    docker pull $mysql_image &
fi
if [ "$use_postgres" == 1 ]; then
    docker pull $postgres_image &
fi
if [ "$use_elastic" == 1 ]; then
    docker pull $elastic_image &
fi
wait

if [ "$use_sqlite" == 1 ]; then
    docker run -v${sqlite_path}:/data/ -u$(id -u):$(id -g) $sqlite_image
fi
if [ "$use_mysql" == 1 ]; then
    MYSQL_ID=$(docker run -d --name moviesdb-mysql -p $mysql_port:$orig_mysql_port $mysql_image)
else
    MYSQL_ID=1
fi
if [ "$use_postgres" == 1 ]; then
    POSTGRES_ID=$(docker run -d --name moviesdb-postgres -p $postgres_port:$orig_postgres_port $postgres_image)
else
    POSTGRES_ID=1
fi
if [ "$use_elastic" == 1 ]; then
    ELASTIC_ID=$(docker run -d --name moviesdb-elk -p $elastic_port:$orig_elastic_port $elastic_image)
else
    ELASTIC_ID=1
fi

if [ "$use_chrome" == 1 ]; then
    CHROME_ID=$(docker run -d --name chrome --shm-size=1024m -p $chrome_port:$chrome_port --cap-add=SYS_ADMIN $chrome_image)
else
    CHROME_ID=1
fi

if [ -z "$ELASTIC_ID" ] || [ -z "$MYSQL_ID" ] || [ -z "$POSTGRES_ID" ] || [ -z "$CHROME_ID" ]; then
	echo "Docker services failed to start..."
	exit 1
fi

echo "Waiting on services to be ready..."

if [ "$use_mysql" == 1 ]; then
    while [ "$(docker inspect -f {{.State.Health.Status}} moviesdb-mysql)" != "healthy" ]; do sleep 0.1; done;
fi
if [ "$use_postgres" == 1 ]; then
    while [ "$(docker inspect -f {{.State.Health.Status}} moviesdb-postgres)" != "healthy" ]; do sleep 0.1; done;
fi
if [ "$use_elastic" == 1 ]; then
    while [ "$(docker inspect -f {{.State.Health.Status}} moviesdb-elk)" != "healthy" ]; do sleep 0.1; done;
fi
