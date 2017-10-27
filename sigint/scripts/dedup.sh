#!/bin/bash

# Change these parameters...
host="http://localhost:9200"
index="terrain-analytics"
type="events"
maxHitsPerBucket=5

#===================================

duplicateQueryResults=$(curl -s -XGET "${host}/${index}/${type}/_search" -d "
{
  \"size\": 0,
  \"query\": {
      \"match_all\": {}
  },
  \"aggs\": {
    \"duplicateCount\": {
      \"terms\": {
        \"script\": \"doc['hash'].value + \\\"_\\\" + doc['intervalBucketSeconds'].value\",
        \"min_doc_count\": 2
      },      
      \"aggs\": {
        \"duplicateDocuments\": {
          \"top_hits\": {
            \"size\": ${maxHitsPerBucket}
          }
        }
      }
    }
  }
}")

numBuckets=$(echo $duplicateQueryResults | jq -r '.aggregations.duplicateCount.buckets | length')

echo "Found $numBuckets buckets with duplicates..."

if [ $numBuckets -eq 0 ]; then
    echo "Exiting since nothing to clean up...";
    exit;
fi

docsToRemove=()
for i in $(seq 0 $((${numBuckets}-1))); do
    dups=($(echo $r1 | jq -r ".aggregations.duplicateCount.buckets[${i}].duplicateDocuments.hits.hits[]._id")) ;
    numDups=($(echo $r1 | jq -r ".aggregations.duplicateCount.buckets[${i}].duplicateDocuments.hits.hits | length")) ;
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

curl -XPOST "${host}/${index}/_bulk" -H 'Content-Type: application/json' --data-binary "${deleteQuery}"

echo "Finished deletion"
