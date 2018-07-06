#!/bin/bash

# SECTION: Parse Input

read -r -d '' HELPSTRING <<"EOF"
Script to Update a Customer Instance.
Usage: update_instance -n name -a address -v version-number -[p]
  -n    name of the customer
  -a    IP address of instance
  -v    Release version number. e.g., 5.1
  -p    (optional) Run the app in production (:3000) and not staging (:7000)
  -s    (optional) Whether to make a copy of the current prod DB in a staging DB, and run that DB.
  -d    (optional) Pass in the name of a DB to use when staging, instead of [customer]_production
  -r    (optional) Skip RSYNC
EOF

if [ $# -eq 0 ]
  then
    echo "Improper usage:";
    echo "$HELPSTRING";
    exit 1;
fi

while getopts "n:a:v:sd:pr" opt; do
  case $opt in
    n)
      CUSTNAME=$OPTARG
      ;;
    a)
      ADDRESS=$OPTARG
      ;;
    v)
      VERSION=$OPTARG
      ;;
    p)
      PRODUCTION=true
      ;;
    d)
      SOURCE_DB_NAME=$OPTARG
      ;;
    s)
      STAGE_DB=true
      ;;
    r)
      SKIP_RSYNC=true
      ;;
    \?)
      echo "Invalid option: -$OPTARG";
      echo "$HELPSTRING";
      ;;
  esac
done

if [ -z "$CUSTNAME" ]
  then
    echo "Error: Customer Name Not Supplied";
    exit 1;
fi

if [ -z "$ADDRESS" ]
  then
    echo "Error: Address Not Supplied";
    exit 1;
fi

if [ -z "$VERSION" ]
  then
    echo "Error: Version Not Supplied";
    exit 1;
fi



# SECTION: Configure Settings

if [ -z "$PRODUCTION" ]
  then
    MIDWAY_DB="${CUSTNAME}_staging"
    PREFIX="staging-"
    SCREEN_ID="7000"
    PORT="7000"
    echo "Deploying to staging instance."
  else
    MIDWAY_DB="${CUSTNAME}_production"
    PREFIX=""
    SCREEN_ID="3000"
    PORT="3000"
    echo "Deploying to production instance."
fi

MIDWAYHOSTNAME="${PREFIX}${CUSTNAME}.terraindata.com";



# SECTION: Stage DB

STAGE_DB_COMMAND=""
if [ "$STAGE_DB" ]
  then
    if [ "$PRODUCTION" ]
      then 
        echo "ERROR: Do not stage the DB when deploying to production; otherwise, you will overwrite the prod DB."
        exit 1;
    fi
    
    if [ -z "$SOURCE_DB_NAME" ]
      then
        SOURCE_DB_NAME="${CUSTNAME}_production"
    fi
    
    echo "Will stage DB: from ${SOURCE_DB_NAME} to ${MIDWAY_DB}"

    # SECTION: Migration Scripts
    # Set up which scripts to run on migrations.
    # Devs: Add references to necessary verion upgrade migrations in this file.
    # Note: These will only run if you are staging the DB.
    # If you are deploying straight to production, and need a migration, you will
    #  need to do that yourself.

    MIGRATION_COMMAND=""
    if [ "$VERSION"="5" ]
      then
        MIGRATION_COMMAND="psql -U 't3rr41n-demo' -d ${MIDWAY_DB} -h localhost -f scripts/MIDWAY_PG_MIGRATION.sql"
        echo "Version 5 migrations applied."
      else
        echo "No migrations needed."
    fi

    
    read -r -d '' STAGE_DB_COMMAND << EOM
      export PGPASSWORD="r3curs1v3$"
      psql -U "t3rr41n-demo" -d postgres -h localhost -p 5432 -c "drop database ${MIDWAY_DB};"
      psql -U "t3rr41n-demo" -d postgres -h localhost -p 5432 -c "create database ${MIDWAY_DB};"
      pg_dump -U "t3rr41n-demo" -d "${SOURCE_DB_NAME}" -h localhost -p 5432 | psql -U "t3rr41n-demo" -d "${MIDWAY_DB}" -h localhost -p 5432 
      ${MIGRATION_COMMAND}
      psql -U "t3rr41n-demo" -d "${MIDWAY_DB}" -h localhost -p 5432 -c 'update schedules set running = false, "shouldRunNext" = false;'
      psql -U "t3rr41n-demo" -d "${MIDWAY_DB}" -h localhost -p 5432 -c "update jobs set status='ABORTED', running=false where running=true;"
EOM
fi


# SECTION: Version 

echo "Beginning instance update with customer name \""$CUSTNAME"\" and IP address" $ADDRESS;
echo "App will use port ${PORT} on version ${VERSION}";
echo "App will be running on: ${MIDWAYHOSTNAME}";
echo "App will use database: ${MIDWAY_DB}";
if [ -z "$SKIP_RSYNC" ]
  then
    cd ..

    (! test -d Search) && (echo "Error: could not find Search directory"; exit 1);

    echo "rsyncing";
    rsync -vrP  --exclude midway.json --exclude midway.db --exclude node_modules --delete  $PWD/Search terrain@${ADDRESS}:src-${VERSION}/ > "rsynclog.log";
    echo "rsync complete"
  else
    echo "skipping rsync"
fi

ssh terrain@${ADDRESS} << EOF
cd src-${VERSION}/Search
screen -S runmidway-${SCREEN_ID} -X quit;
${STAGE_DB_COMMAND}
screen -d -m -S runmidway-${SCREEN_ID};
screen -S runmidway-${SCREEN_ID} -X stuff "yarn; yarn build-prod;\r";
screen -S runmidway-${SCREEN_ID} -X stuff "NODE_ENV=production yarn start-midway -p ${PORT} -i ${MIDWAY_DB} > >(tee -a /var/log/midway/midway_${VERSION}_${PORT}.log) 2> >(tee -a /var/log/midway/midway_error_${VERSION}_${PORT}.log >&2)\r";
EOF

echo "End of Update Script";
