#!/bin/bash

read -r -d '' HELPSTRING <<"EOF"
Script to Update a Customer Instance.
Usage: update_instance -n name -a address -[p]
  -n    name of the customer
  -a    IP address of instance
  -p    Is production and not staging
EOF

if [ $# -eq 0 ]
  then
    echo "Improper usage:";
    echo "$HELPSTRING";
    exit 1;
fi

PREFIX="staging-"

while getopts "n:a:p" opt; do
  case $opt in
    n)
      CUSTNAME=$OPTARG
      ;;
    a)
      ADDRESS=$OPTARG
      ;;
    p)
      PREFIX=""
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

MIDWAYHOSTNAME="${PREFIX}${CUSTNAME}.terraindata.com";

echo "Beginning instance update with customer name \""$CUSTNAME"\" and address" $ADDRESS;
echo "Using host name ${MIDWAYHOSTNAME}";

echo "removing node modules...";

rm -rf node_modules;
cd ..

(! test -d Search) && (echo "Error: could not find Search directory"; exit 1);

echo "rsyncing";

rsync -vrP  --exclude midway.json --exclude midway.db --delete  $PWD/Search terrain@${ADDRESS}:src/ > "rsynclog.log";

ssh terrain@${ADDRESS} << EOF
cd src/Search
screen -S runmidway -X quit;
screen -d -m -S runmidway;
screen -S runmidway -X stuff "yarn; MIDWAY_HOST=${MIDWAYHOSTNAME} yarn build-prod; NODE_ENV=production yarn start > >(tee -a ~/midway.log) 2> >(tee -a ~/midway_error.log >&2)^M";
EOF

echo "End of Update Script";
