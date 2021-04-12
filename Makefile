.PHONY: all updater

all: src/lib/proto.js src/lib/contracts.json
	yarn build

src/lib/proto.js: protobuf/*.proto
	yarn run pbjs -p protobuf -t static-module -w es6 -o src/lib/proto.js protobuf/*.proto
	yarn run pbts -o src/lib/proto.d.ts src/lib/proto.js
	# Fix issue of Long not being imported.
	# https://github.com/protobufjs/protobuf.js/issues/1533
	# https://github.com/protobufjs/protobuf.js/pull/1166
	sed -i "1 i import { Long } from 'protobufjs';" src/lib/proto.d.ts

src/lib/contracts.json:
	jq '[.[].proto]' data/contracts.json > src/lib/contracts.json

updater:
	goreleaser --snapshot --rm-dist --skip-publish

clean:
	@$(RM) -r src/lib/proto.js src/lib/proto.d.ts src/lib/contracts.json dist
