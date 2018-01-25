#!/bin/bash

PG_DB_NAME="midway"
PG_USER_NAME="t3rr41n-demo"
PG_PASSWORD="r3curs1v3$"

PGPASSWORD=$PG_PASSWORD psql -U $PG_USER_NAME -d $PG_DB_NAME -h localhost -p 5432 -c "\dt" | grep public | cut -d'|' -f2 | tr -d '[:blank:]' |
while read pg_table_name; do
  seqNumber=`PGPASSWORD=$PG_PASSWORD psql -U $PG_USER_NAME -d $PG_DB_NAME -h localhost -p 5432 -c "SELECT MAX(id)+1 FROM \"$pg_table_name\"" | grep -v "row" | grep -o '[[:digit:]]' | tr -d '[:blank:]'`
  seqNumber=`echo $seqNumber | sed 's/ //g'`
  if [ "$seqNumber" = "" ]; then
    seqNumber=1
  fi
  seqName=$pg_table_name'_id_seq'
  PGPASSWORD=$PG_PASSWORD psql -U $PG_USER_NAME -d $PG_DB_NAME -h localhost -p 5432 -c "CREATE SEQUENCE \"$seqName\" MINVALUE 1"
  PGPASSWORD=$PG_PASSWORD psql -U $PG_USER_NAME -d $PG_DB_NAME -h localhost -p 5432 -c "ALTER TABLE \"$pg_table_name\" ALTER id SET DEFAULT nextval('$seqName')"
  PGPASSWORD=$PG_PASSWORD psql -U $PG_USER_NAME -d $PG_DB_NAME -h localhost -p 5432 -c "ALTER SEQUENCE $seqName OWNED BY $pg_table_name.id"
done

PGPASSWORD=$PG_PASSWORD psql -U $PG_USER_NAME -d $PG_DB_NAME -h localhost -p 5432 -c "\ds" | grep sequence | cut -d'|' -f2 | tr -d '[:blank:]' |
while read sequence_name; do
  table_name=${sequence_name%_id_seq}
  PGPASSWORD=$PG_PASSWORD psql -U $PG_USER_NAME -d $PG_DB_NAME -h localhost -p 5432 -c "select setval('public.\"$sequence_name\"', (select max(id) from \"$table_name\"))"
done
