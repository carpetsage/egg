#!/bin/sh
./getConfig.py > /tmp/config.json
jq -S 'walk(if type == "object" and has("secondsRemaining") then del(.secondsRemaining) else . end)' /tmp/config.json > config.json
wget https://gist.githubusercontent.com/carpetsage/${GIST_ID}/raw/config.json -O /tmp/gist.json
# push gist if there's a changes
diff config.json /tmp/gist.json || node ./push-gist.js
