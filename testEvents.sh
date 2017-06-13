#!/bin/bash

msg=$(curl -sS -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d '[{"eventId":"nola","variantId":"2"},{"eventId":2,"variantId":"whoa"}]' localhost:3000/events/ | jq -r 'fromjson | .[].message')

curl -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d '{"eventId":"nola","payload":{"drink":"moron_bowl","ingredients":"something stupid"},"type":"celebration","message":"'$msg'"}' localhost:3000/events/update/
