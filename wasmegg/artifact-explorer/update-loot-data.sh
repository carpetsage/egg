#!/bin/sh
echo "Downloading loot.json"
HTTP_CODE=$(curl -so loot_raw.json --write-out "%{http_code}" https://eggincdatacollection.azurewebsites.net/api/GetCarpetData)
echo "HTTP $HTTP_CODE"
if [ -s loot_raw.json ]; then
  echo 'compacting json'
  jq -c . loot_raw.json > src/lib/loot.json
fi
rm loot_raw.json
