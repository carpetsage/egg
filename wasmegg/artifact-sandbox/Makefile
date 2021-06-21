.PHONY: all init build dist clean dev serve

all: clean
	$(MAKE) dist

init:

build: src/lib/proto.js
	yarn build

dist: build
	../_tools/build.py dist --additional assets --additional static

src/lib/proto.js: src/lib/schema.proto
	yarn run pbjs -p protobuf -t static-module -w es6 --force-number -o src/lib/proto.js src/lib/schema.proto
	yarn run pbts -o src/lib/proto.d.ts src/lib/proto.js

clean:
	@$(RM) -r dist

dev:
	yarn dev

serve:
	yarn serve
