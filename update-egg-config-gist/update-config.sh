#!/bin/bash
uv run ./getConfig.py > config.json
# delete isNew and secondsRemaining fields if they exist
jq -S 'walk(try (del(.secondsRemaining) | del(.secondsUntilAvailable))//.)' config.json > configstripped.json
wget https://gist.githubusercontent.com/carpetsage/${GIST_ID}/raw/config.json -O /tmp/gist.json
jq -S 'walk(try (del(.secondsRemaining) | del(.secondsUntilAvailable))//.)' /tmp/gist.json > giststripped.json
# push gist if there's a change and config.json not empty
if [ -s config.json ]; then
  diff configstripped.json giststripped.json || node ./push-gist.js
fi
