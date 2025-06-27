.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build: src/lib/version_history.json
	pnpm build

src/lib/version_history.json:
	cd tools/version_history
	go run tools/version_history/main.go

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
