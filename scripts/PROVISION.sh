#!/bin/sh

## generate and print out the default user's access token
defaultUserAccessToken=`curl -s -XPOST -H 'Content-Type: application/json' -d '{"email":"admin@terraindata.com","password":"CnAATPys6tEB*ypTvqRRP5@2fUzTuY!C^LZP#tBQcJiC*5"}' 'localhost:3000/midway/v1/auth/login' | jq .accessToken | sed -e 's/"//g'`
echo "${defaultUserAccessToken}"

