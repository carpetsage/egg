.PHONY: all init build data dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build: data
	pnpm build

data:
	./update-loot-data.sh

dist: build
	../_tools/build.py dist --additional assets --additional static

fastbuild: clean
	$(MAKE) data
	pnpm fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist

dev:
	pnpm dev

serve:
	pnpm serve
