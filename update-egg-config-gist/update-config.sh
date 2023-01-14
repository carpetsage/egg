#!/bin/sh
./getConfig.py > /tmp/config.json
# delete isNew and secondsRemaining fields if they exist
jq -S 'walk(try (del(.isNew) | del(.secondsRemaining))//.)' /tmp/config.json > config.json
wget https://gist.githubusercontent.com/carpetsage/${GIST_ID}/raw/config.json -O /tmp/gist.json
# push gist if there's a changes
diff config.json /tmp/gist.json || node ./push-gist.js
