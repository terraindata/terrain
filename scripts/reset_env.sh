#!/bin/bash

read -r -d '' HELPSTRING <<"EOF"
Script to Reset Midway and Docker State
Usage: reset_all~ [-all] | [-euid] [-x s]
  --all equivalent to -euito
  -e    drop ETL tables
  -u    drop users table
  -i    drop items (groups, categories, algorithms)
  -d    reset the docker test Elastic Index (My Elastic Database)
  -o    drop other miscellaneous tables
  -x    drop the specified table
EOF

dropSpecific() {
  echo "Dropping Table: " $1;
  PGPASSWORD="r3curs1v3$" psql -U "t3rr41n-demo" -d midway -h localhost -c "DROP TABLE IF EXISTS $1; " -p 5432;
}

resetES () {
  echo "Resetting My Elastic Search Index";
  yarn test-back-teardown;
  yarn test-back-setup;
}

dropItems () {
  echo "Dropping Items Table";
  dropSpecific 'items';
}

dropUsers() {
  echo "Dropping Users Table";
  dropSpecific 'users';
}

dropETL() {
  echo "Dropping ETL Tables";
  dropSpecific 'templates';
  dropSpecific 'schedules';
  dropSpecific 'schedulerLogs';
  dropSpecific 'jobs';
  dropSpecific 'integrations';
}

dropOther() {
  echo "Dropping Miscellaneous Tables";
  dropSpecific 'metrics';
  dropSpecific 'schemaMetadata';
  dropSpecific 'statusHistory';
  dropSpecific 'versions';
  dropSpecific 'resultsConfig';
}

if [ $# -eq 0 ]; then
  echo "No Options Specified";
  echo "$HELPSTRING";
fi

if [[ $1 = "--all" ]]; then
  dropItems;
  dropUsers;
  dropETL;
  dropOther;
  resetES;
else
  while getopts "iuedxo:" opt; do
    case $opt in
      i)
        dropItems
        ;;
      u)
        dropUsers
        ;;
      e)
        dropETL
        ;;
      d)
        resetES
        ;;
      x)
        dropSpecific ${OPTARG};
        ;;
      o)
        dropOther
        ;;
      \?)
        echo "Invalid option: -$OPTARG";
        echo "$HELPSTRING";
        ;;
    esac
  done
fi
