.PHONY: all init build data dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build: data
	yarn build

data:
	go run .

dist: build
	../_tools/build.py dist --additional assets --additional static

fastbuild: clean
	$(MAKE) data
	yarn fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist

dev:
	yarn dev

serve:
	yarn serve
