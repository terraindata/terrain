#!/bin/bash

# Default parameters
host="http://localhost:9200"
index="terrain-analytics"
type="events"
maxHitsPerBucket=5
verbose=0

# Read parameters from command line
while [[ "$#" > 0 ]]; do case $1 in
    --host) host="$2"; shift; shift;;
    --index) index="$2"; shift; shift;;
    --type) type="$2"; shift; shift;;
    --maxHitsPerBucket) maxHitsPerBucket=$2; shift; shift;;
    --verbose) verbose=1; shift;;
    *) echo "$1 is not a recognized flag"; exit 1;;
  esac;
done

echo "Begin deleting duplicates..."
echo "Host: $host"
echo "Index: $index"
echo "Type: $type"
echo "Max hits per bucket: $maxHitsPerBucket"
echo "Verbose: $verbose"

#===================================

duplicateQueryResults=$(curl -s -XGET "${host}/${index}/${type}/_search" -d "
{
  \"size\": 0,
  \"query\": {
      \"match_all\": {}
  },
  \"track_scores\": false,
  \"sort\": \"_doc\",
  \"aggs\": {
    \"duplicateCount\": {
      \"terms\": {
        \"script\": \"doc['hash'].value + \\\"_\\\" + doc['intervalBucketSeconds'].value\",
        \"min_doc_count\": 2
      },      
      \"aggs\": {
        \"duplicateDocuments\": {
          \"top_hits\": {
            \"size\": ${maxHitsPerBucket},
            \"track_scores\": false,
            \"sort\": \"_doc\",
            \"_source\": {
              \"includes\": [ \"_id\" ]
            }
          }
        }
      }
    }
  }
}")

numBuckets=$(echo $duplicateQueryResults | jq -r '.aggregations.duplicateCount.buckets | length')
if [ ! "$numBuckets" ] ; then
    echo "Error with duplicate query result..."$'\n';
    echo $duplicateQueryResults;
    exit 1;
fi

if [ -z $verbose ] ; then
    echo $duplicateQueryResults;
fi

echo "Found $numBuckets buckets with duplicates..."

if [ $numBuckets -eq 0 ]; then
    echo "Exiting since nothing to clean up...";
    exit;
fi

docsToRemove=()
for i in $(seq 0 $((${numBuckets}-1))); do
    dups=($(echo $duplicateQueryResults | jq -r ".aggregations.duplicateCount.buckets[${i}].duplicateDocuments.hits.hits[]._id")) ;
    numDups=($(echo $duplicateQueryResults | jq -r ".aggregations.duplicateCount.buckets[${i}].duplicateDocuments.hits.hits | length")) ;
    echo "In bucket $i, found $numDups duplicates..." ;
    dups=(${dups[@]:1}) # leave in the first event, just delete the duplicates of that event
    docsToRemove=("${docsToRemove[@]}" "${dups[@]}")
done

echo "Building bulk delete query..."

deleteQuery=""
for id in "${docsToRemove[@]}"
do
    deleteQuery+="{\"delete\":{\"_index\":\"${index}\",\"_type\":\"${type}\",\"_id\":\"${id}\"}}"$'\n'
done

echo "Executing bulk delete query..."

bulkQueryResult=$(curl -XPOST "${host}/${index}/_bulk" -H 'Content-Type: application/json' --data-binary "${deleteQuery}")

if [ -z $verbose ] ; then
    echo $bulkQueryResult;
fi

echo $'\n'"Finished deletion"
