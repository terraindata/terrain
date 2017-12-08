#!/bin/bash

msg=$(curl -sS -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d '[{"eventId":"oldpro","algorithmId":"whoa"}]' localhost:3000/events/ | jq -r 'fromjson | .[].message')

curl -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d '{"eventId":"oldpro","payload":{"drink":"some IPAs","ingredients":"habanero deliciousness","habanero_wings":"yes plz","isAlcoholic":true,"beerCounter":2},"type":"celebration","message":"'$msg'"}' localhost:3000/events/update/
