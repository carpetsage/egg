#!/bin/sh
echo "Downloading loot.json"
#URL="https://eggincdatacollection.azurewebsites.net/api/GetCarpetData"
#URL="https://eggincdatacollection.azurewebsites.net/api/GetCarpetDataTrimmed"
#URL="https://eggincdatacollection.azurewebsites.net/api/GetCarpetDataTrimmed?oldDropsOnly"
URL="https://eggincdatacollection.azurewebsites.net/api/GetCarpetDataTrimmed?newDropsOnly"
HTTP_CODE=$(curl -so loot_raw.json --write-out "%{http_code}" "${URL}")
echo "HTTP ${HTTP_CODE}"
if [ -s loot_raw.json ]; then
  echo 'updating loot.json'
  # jq instead of mv to get rid of evil windows newlines
  jq -r . loot_raw.json > "$(dirname $0)"/src/lib/loot.json
  rm loot_raw.json
fi
