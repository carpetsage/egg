.PHONY: all init

all: proto/index.js

init:
	yarn install

proto/index.js: ../protobuf/*.proto
	yarn run pbjs -p protobuf -t static-module -w es6 --force-number -o proto/index.js ../protobuf/*.proto
	yarn run pbts -o proto/index.d.ts proto/index.js
