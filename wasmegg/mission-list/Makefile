.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build:
	yarn build

dist: build
	../_tools/build.py dist --additional assets

fastbuild: clean
	yarn fastbuild
	../_tools/build.py dist --additional assets

clean:
	@$(RM) -r dist

dev:
	yarn dev

serve:
	yarn serve
