.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build: src/lib/data.json
	yarn build

dist: build
	../_tools/build.py dist --additional assets --additional static

src/lib/data.json:
	go run .

fastbuild: clean
	$(MAKE) src/lib/data.json
	yarn fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist src/lib/data.json

dev:
	yarn dev

serve:
	yarn serve
