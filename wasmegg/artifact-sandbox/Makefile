.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build: src/lib/data.json
	pnpm build

dist: build
	../_tools/build.py dist --additional assets --additional static

src/lib/data.json:
	go run .

fastbuild: clean
	$(MAKE) src/lib/data.json
	pnpm fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist src/lib/data.json

dev:
	pnpm dev

serve:
	pnpm serve
