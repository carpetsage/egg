#!/bin/sh
echo "Downloading loot.json"
FULLDATA_URL="https://eggincdatacollection.azurewebsites.net/api/GetCarpetData"
TRIMMEDATA_URL="https://eggincdatacollection.azurewebsites.net/api/GetCarpetDataTrimmed"
HTTP_CODE=$(curl -so loot_raw.json --write-out "%{http_code}" ${TRIMMEDATA_URL})
echo "HTTP $HTTP_CODE"
if [ -s loot_raw.json ]; then
  echo 'compacting json'
  jq -c . loot_raw.json > src/lib/loot.json
fi
rm loot_raw.json
