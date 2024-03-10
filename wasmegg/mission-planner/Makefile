.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build:
	pnpm build

dist: build
	../_tools/build.py dist --additional assets

fastbuild: clean
	pnpm fastbuild
	../_tools/build.py dist --additional assets

clean:
	@$(RM) -r dist

dev:
	pnpm dev

serve:
	pnpm serve
