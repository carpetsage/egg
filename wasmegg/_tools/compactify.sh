#!/bin/sh
jq -c . $1 > /tmp/tmp.json
mv /tmp/tmp.json $1
