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

echo "*************************************************"
echo "Welcome to Deploy-o-matic 30024"
echo "It is our pleasure to deploy you today"
echo "When presented with [y/n] options, a single letter answer will suffice"
echo "When available, the default will be uppercase (e.g., [Y\n] defaults to Yes)"
echo "Simply press Enter / Return to accept that default."
echo "*************************************************"

echo ""

echo "Let's make sure you have permissions on this host."
echo "Look for an error message about public key denied below:"
echo "-------------------------------------------------"
echo ""

ssh terrain@${ADDRESS} << EOF
echo "ssh'd in"
EOF

echo ""
echo "-------------------------------------------------"
echo "*************************************************"

echo "Above, did you see a message saying you were rejected because of your publickey?"
read -n1 -p "Did you? [y\N] " HAS_PERMS
echo ""
if [ "$HAS_PERMS" = "y" ] || [ "$HAS_PERMS" = "Y" ]
  then 
    echo "Ah, you need to get a kind wizard like Justin or Luke to give you perms."
    echo "Ta-ta for now."
    exit 1;
  else
    echo "Excellent, your credentials have served you well."
fi

echo ""
echo "*************************************************"

echo "Our default is to deploy to staging."
read -n1 -p "Would you care to deploy to production instead? [y/N] " PRODUCTION
echo ""

if [ "$PRODUCTION" = "y" ] || [ "$PRODUCTION" = "Y" ]
  then
    read -n1 -p "Please confirm you desire to deploy to production? [y/N] " PRODUCTION
    echo ""
    if [ "$PRODUCTION" = "y" ] || [ "$PRODUCTION" = "Y" ]
      then
        PRODUCTION=true
      else
        echo "Mismatched input, aborting! Please re-attempt your deploy, kind engineer!"
        exit 1;
    fi
    read -n1 -p "Do you also want to kill Staging and switch the staging DB to be the production DB? [y/N] " SWITCH_RESPONSE
    if [ "$SWITCH_RESPONSE" = "y" ] || [ "$SWITCH_RESPONSE" = "Y" ]
      then
        SWITCH_FROM_STAGING="switch"
    fi
    echo ""
  else
    PRODUCTION=""
    echo "*************************************************"
    echo "When deploying to Staging for the first time, it is common to copy the production DB to a staging DB."
    read -n1 -p "Copy production DB to staging DB? [y\N] " STAGE_DB
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
            
            # Used to ask to confirm the default option, but this was annoying.
            # echo "Default source DB for version ${VERSION} to copy is ${SOURCE_DB_NAME}"
            # read -n1 -p "Is this ok? [y\N] " STAGE_DB_CONFIRM
            # echo ""
            # if [ "$STAGE_DB_CONFIRM" = "y" ] || [ "$STAGE_DB_CONFIRM" = "Y" ]
            #   then
            #     echo "Thanks for confirming."
            #   else
            #     echo "Aborting!"
            #     exit 1;
            # fi
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
        read -r -d '' MIGRATION_COMMAND << EOM
        psql -U 't3rr41n-demo' -d ${MIDWAY_DB} -h localhost -f scripts/MIDWAY_PG_MIGRATION.sql;
        psql -U 't3rr41n-demo' -d ${MIDWAY_DB} -h localhost -c "UPDATE items SET name = name || ' ' || id WHERE id in (SELECT b.id FROM items as a, items as b WHERE b.id > a.id AND a.name = b.name AND a.parent = b.parent AND a.name <> '')";
EOM
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
  else
    if [ "$SWITCH_FROM_STAGING" = "switch" ]
      then
        # kill screen(s) and rename DB
        # note: you can remove the old runmidway screen command once that is outdated
        read -r -d '' STAGE_DB_COMMAND << EOM
        screen -S runmidway -X stuff $'\cc';
        screen -S runmidway-7000 -X stuff $'\cc';
        export PGPASSWORD="r3curs1v3$";
        echo "It's ok if you see a 'no database found' error for 'production_backup' or '${MIDWAY_DB}";
        echo "It's NOT ok if you see a 'no database found' error for '${CUSTNAME}_staging' -- BAD!";
        echo "--- DB Commands ---";
        psql -U "t3rr41n-demo" -d postgres -h localhost -p 5432 -c "drop database production_backup;";
        psql -U "t3rr41n-demo" -d postgres -h localhost -p 5432 -c "alter database ${MIDWAY_DB} rename to production_backup;";
        psql -U "t3rr41n-demo" -d postgres -h localhost -p 5432 -c "alter database ${CUSTNAME}_staging rename to ${MIDWAY_DB};";
        echo "--- End DB Commands ---";
EOM
    fi
fi


# SECTION: Version 

echo "*************************************************"
echo "Beginning instance update with customer name \""$CUSTNAME"\" and IP address" $ADDRESS;
echo "App will use port ${PORT} on version ${VERSION}";
echo "App will be running on: ${MIDWAYHOSTNAME}";
echo "App will use database: ${MIDWAY_DB}";
echo "*************************************************"

read -n1 -p "Skip RSYNC? [y\N] " SKIP_RSYNC
echo ""

if [ "$SKIP_RSYNC" = "y" ] || [ "$SKIP_RSYNC" = "Y" ]
  then
    echo "Skipping RSYNC."
  else
    cd ..

    (! test -d Search) && (echo "Error: could not find Search directory"; exit 1);

    echo "rsyncing";
    rsync -vrP --progress  --exclude midway.json --exclude midway.db --exclude node_modules --exclude .cache --exclude .git --exclude build --exclude coverage --exclude midway/src/bundles --exclude rr --exclude *.db --exclude bundle.js --delete  $PWD/Search terrain@${ADDRESS}:src-${VERSION}/ > "rsynclog.log";
    echo "rsync complete"
fi

echo "*************************************************"
echo "Look for 'no screen session found' message below:"
echo "-------------------------------------------------"
echo ""

ssh terrain@${ADDRESS} << EOF
screen -S runmidway-${SCREEN_ID} -X stuff $'\cc';
EOF

echo ""
echo "-------------------------------------------------"
echo "*************************************************"

echo "Above, did you see a message saying 'No screen session found' ?"
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
screen -S runmidway-${SCREEN_ID} -X stuff "NODE_ENV=production yarn start-midway-prod -p ${PORT} -i ${MIDWAY_DB} > >(tee -a /var/log/midway/midway_${VERSION}_${PORT}.log) 2> >(tee -a /var/log/midway/midway_error_${VERSION}_${PORT}.log >&2)\r";
EOF

echo "*************************************************"

echo "Update Complete";
echo "It has been our pleasure to be your deploy cyborg this fine morning/day/evening"
echo ""
