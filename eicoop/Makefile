.PHONY: all updater

all: src/lib/contracts.json
	yarn build

src/lib/contracts.json:
	jq '[.[].proto]' data/contracts.json > src/lib/contracts.json

updater:
	goreleaser --snapshot --rm-dist --skip-publish

clean:
	@$(RM) -r src/lib/proto.js src/lib/proto.d.ts src/lib/contracts.json dist
