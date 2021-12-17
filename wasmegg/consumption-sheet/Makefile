.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build: src/data.json
	yarn build

src/data.json:
	go run .

dist: build
	../_tools/build.py dist --additional assets

fastbuild: clean
	$(MAKE) src/data.json
	yarn fastbuild
	../_tools/build.py dist --additional assets

clean:
	@$(RM) -r dist src/data.json

dev:
	yarn dev

serve:
	yarn serve
