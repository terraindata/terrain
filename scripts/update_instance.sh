#!/bin/bash

# SECTION: Parse Input

read -r -d '' HELPSTRING <<"EOF"
Script to Update a Customer Instance.
Usage: update_instance -n name -a address -v version-number -[p]
  -n    name of the customer
  -a    IP address of instance
  -v    Release version number. e.g., 5.1. CURRENT DEFAULT is 5
  -d    (optional) Pass in the name of a DB to use when staging, instead of [customer]_production (midway for v5)
EOF

if [ $# -eq 0 ]
  then
    echo "Improper usage:";
    echo "$HELPSTRING";
    exit 1;
fi

while getopts "n:a:v:d:" opt; do
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
    d)
      SOURCE_DB_NAME=$OPTARG
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
    VERSION=5
    echo "IMPORTANT: No version supplied, assuming version 5";
fi



echo "Default is to deploy to staging."
read -n1 -p "Deploy to production instead? [y/N] " PRODUCTION
echo ""

if [ "$PRODUCTION" = "y" ] || [ "$PRODUCTION" = "Y" ]
  then
    read -n1 -p "Please confirm you want to eploy to production? [y/N] " PRODUCTION
    echo ""
    if [ "$PRODUCTION" = "y" ] || [ "$PRODUCTION" = "Y" ]
      then
        PRODUCTION=true
      else
        echo "Mismatched input, aborting!"
        exit 1;
    fi
  else
    PRODUCTION=""
    read -n1 -p "Stage production DB? [Y/n] " STAGE_DB
    echo ""
    if [ "$STAGE_DB" = "y" ] || [ "$STAGE_DB" = "Y" ]
      then
        STAGE_DB=true
        
        if [ -z "$SOURCE_DB_NAME" ]
          then
            # provide default
            if [ "$VERSION" = "5" ]
              then
                SOURCE_DB_NAME="midway"
              else
                SOURCE_DB_NAME="${CUSTNAME}_production"
            fi
            
            echo "Default source DB for version ${VERSION} to copy is ${SOURCE_DB_NAME}"
            read -n1 -p "Is this ok? [y\N] " STAGE_DB_CONFIRM
            echo ""
            if [ "$STAGE_DB_CONFIRM" = "y" ] || [ "$STAGE_DB_CONFIRM" = "Y" ]
              then
                echo "Thanks for confirming."
              else
                echo "Aborting!"
                exit 1;
            fi
        fi
        
      else
        STAGE_DB=""
    fi
    
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
    
    echo "Will stage DB: from ${SOURCE_DB_NAME} to ${MIDWAY_DB}"

    # SECTION: Migration Scripts
    # Set up which scripts to run on migrations.
    # Devs: Add references to necessary verion upgrade migrations in this file.
    # Note: These will only run if you are staging the DB.
    # If you are deploying straight to production, and need a migration, you will
    #  need to do that yourself.

    MIGRATION_COMMAND=""
    if [ "$VERSION" = "5" ]
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

read -n1 -p "Skip RSYNC? [y\N] " SKIP_RSYNC
echo ""

if [ "$SKIP_RSYNC" = "y" ] || [ "$SKIP_RSYNC" = "Y" ]
  then
    echo "Skipping RSYNC."
  else
    cd ..

    (! test -d Search) && (echo "Error: could not find Search directory"; exit 1);

    echo "rsyncing";
    rsync -vrP  --exclude midway.json --exclude midway.db --exclude node_modules --delete  $PWD/Search terrain@${ADDRESS}:src-${VERSION}/ > "rsynclog.log";
    echo "rsync complete"
fi

ssh terrain@${ADDRESS} << EOF
screen -S runmidway-${SCREEN_ID} -X stuff $'\cc';
EOF

echo "One last thing: did you just now see a message saying 'No screen found' ?"
HAS_SCREEN=""
while [ "$HAS_SCREEN" != "y" ] && [ "$HAS_SCREEN" != "n" ]; do
  read -n1 -p "Did you? [y\n] " HAS_SCREEN
done
echo ""

START_SCREEN_COMMAND=""
if [ "${HAS_SCREEN}" = "y" ]
  then
    START_SCREEN_COMMAND="screen -d -m -S runmidway-${SCREEN_ID};"
fi


ssh terrain@${ADDRESS} << EOF
cd /home/terrain/src-${VERSION}/Search;
${STAGE_DB_COMMAND}
${START_SCREEN_COMMAND}
screen -S runmidway-${SCREEN_ID} -X stuff "cd /home/terrain/src-${VERSION}/Search;\r";
screen -S runmidway-${SCREEN_ID} -X stuff "yarn; yarn build-prod;\r";
screen -S runmidway-${SCREEN_ID} -X stuff "NODE_ENV=production yarn start-midway -p ${PORT} -i ${MIDWAY_DB} > >(tee -a /var/log/midway/midway_${VERSION}_${PORT}.log) 2> >(tee -a /var/log/midway/midway_error_${VERSION}_${PORT}.log >&2)\r";
EOF

echo "End of Update Script";
