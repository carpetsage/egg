.PHONY: all init data proto build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

proto: src/lib/schema.js

src/lib/schema.js: src/lib/schema.proto
	pnpm pbjs -t static-module -w es6 --force-number -o src/lib/schema.js src/lib/schema.proto
	pnpm pbts -o src/lib/schema.d.ts src/lib/schema.js

build: data proto
	pnpm build

data:
	go run .

dist: build
	../_tools/build.py dist --additional assets --additional static

fastbuild: clean
	$(MAKE) data
	pnpm fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist src/lib/catalog.json

dev:
	pnpm dev

serve:
	pnpm serve
