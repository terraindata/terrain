#!/bin/bash

read -r -d '' HELPSTRING <<"EOF"
Script to Update a Customer Instance.
Usage: update_instance -n name -a address -v version-number -[p]
  -n    name of the customer
  -a    IP address of instance
  -v    Release version number. e.g., 5.1
  -p    Is production and not staging
EOF

if [ $# -eq 0 ]
  then
    echo "Improper usage:";
    echo "$HELPSTRING";
    exit 1;
fi

PREFIX="staging-"
SCREEN_ID="7000"

while getopts "n:a:v:p" opt; do
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
      PREFIX=""
      SCREEN_ID="3000"
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

MIDWAYHOSTNAME="${PREFIX}${CUSTNAME}.terraindata.com";

echo "Beginning instance update with customer name \""$CUSTNAME"\" and IP address" $ADDRESS;
echo "App will be running on: ${MIDWAYHOSTNAME}";

echo "removing node modules...";

# rm -rf node_modules;
cd ..

(! test -d Search) && (echo "Error: could not find Search directory"; exit 1);

echo "rsyncing";

rsync -vrP  --exclude midway.json --exclude midway.db --exclude node_modules --delete  $PWD/Search terrain@${ADDRESS}:src-${VERSION}/ > "rsynclog.log";

ssh terrain@${ADDRESS} << EOF
cd src-${VERSION}/Search
screen -S runmidway-${SCREEN_ID} -X quit;
screen -d -m -S runmidway-${SCREEN_ID};
screen -S runmidway-${SCREEN_ID} -X stuff "yarn; yarn build-prod;";
screen -S runmidway-${SCREEN_ID} -X stuff "NODE_ENV=production yarn start-midway > >(tee -a /var/log/midway/midway.log) 2> >(tee -a /var/log/midway/midway_error.log >&2)";
EOF

echo "End of Update Script";
