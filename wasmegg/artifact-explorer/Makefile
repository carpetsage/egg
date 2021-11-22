.PHONY: all init build dist clean dev serve

all: clean
	$(MAKE) dist

init:

build: data
	yarn build

data:
	go run .

dist: build
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist

dev:
	yarn dev

serve:
	yarn serve
