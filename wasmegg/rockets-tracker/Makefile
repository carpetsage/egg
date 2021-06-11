.PHONY: all init build dist clean dev serve

all: clean
	$(MAKE) dist

init:

build: src/lib/sandbox/schema.js
	yarn build

dist: build
	../_tools/build.py dist --additional assets --additional static

src/lib/sandbox/schema.js: ../artifact-sandbox/src/lib/schema.proto
	yarn run pbjs -t static-module -w es6 --force-number -o src/lib/sandbox/schema.js ../artifact-sandbox/src/lib/schema.proto
	yarn run pbts -o src/lib/sandbox/schema.d.ts src/lib/sandbox/schema.js

clean:
	@$(RM) -r dist

dev:
	yarn dev

serve:
	yarn serve
