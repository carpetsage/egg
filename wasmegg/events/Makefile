.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init: update-events-data

build:
	yarn build

dist: build
	../_tools/build.py dist --additional assets

fastbuild: clean
	yarn fastbuild
	../_tools/build.py dist --additional assets

update-events-data:
	curl -f -o src/events.json https://egginc-events-api.zw.workers.dev/

clean:
	@$(RM) -r dist

dev:
	yarn dev

serve:
	yarn serve
