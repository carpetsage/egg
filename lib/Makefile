.PHONY: all init

all: proto/index.js sandbox/schema.js

init:
	yarn install

proto/index.js: ../protobuf/*.proto
	yarn run pbjs -p protobuf -t static-module -w es6 --force-number -o proto/index.js ../protobuf/*.proto
	yarn run pbts -o proto/index.d.ts proto/index.js

sandbox/schema.js: sandbox/schema.proto
	yarn run pbjs -t static-module -w es6 --force-number -o sandbox/schema.js sandbox/schema.proto
	yarn run pbts -o sandbox/schema.d.ts sandbox/schema.js
