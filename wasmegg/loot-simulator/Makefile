.PHONY: all init data build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

data:
	go run .

build: data
	pnpm build

dist: build
	../_tools/build.py dist --additional assets --additional static

fastbuild: clean
	$(MAKE) data
	pnpm fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist src/app-data.json

dev:
	pnpm dev

serve:
	pnpm serve
