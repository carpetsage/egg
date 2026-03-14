.PHONY: all init build data dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build:
	pnpm build

data:
	./update-loot-data.sh

testdata:
	./update-loot-data.sh test

dist: build
	../_tools/build.py dist --additional assets --additional static

fastbuild: clean
	pnpm fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist

dev:
	pnpm dev

serve:
	pnpm serve
