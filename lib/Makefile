.PHONY: all init

all: proto/index.js

init:
	yarn install

proto/index.js: ../protobuf/*.proto
	yarn run pbjs -p protobuf -t static-module -w es6 -o proto/index.js ../protobuf/*.proto
	yarn run pbts -o proto/index.d.ts proto/index.js
	# Fix issue of Long not being imported.
	# https://github.com/protobufjs/protobuf.js/issues/1533
	# https://github.com/protobufjs/protobuf.js/pull/1166
	sed -i "1 i import { Long } from 'protobufjs';" proto/index.d.ts
