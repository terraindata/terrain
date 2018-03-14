#!/bin/bash

PG_DB_NAME="midway"
PG_USER_NAME="t3rr41n-demo"
PG_PASSWORD="r3curs1v3$"

updateTable_statusHistory="UPDATE items\
  SET status='DEPLOYED'\
  WHERE status='LIVE'"

PGPASSWORD=$PG_PASSWORD psql -U $PG_USER_NAME -d $PG_DB_NAME -h localhost -p 5432 -c "$updateTable_statusHistory"
