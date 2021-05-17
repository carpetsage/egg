.PHONY: all init data build dist clean dev serve

all: clean
	$(MAKE) dist

init:
	yarn install

build: data
	yarn build

data:
	go run .

dist: build
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist src/lib/catalog.json

dev:
	yarn dev

serve:
	yarn serve
