.PHONY: all init build dist clean dev serve

all: clean
	$(MAKE) dist

init:

build: src/data.json
	yarn build

src/data.json:
	go run .

dist: build
	../_tools/build.py dist --additional assets

clean:
	@$(RM) -r dist

dev:
	yarn dev

serve:
	yarn serve
