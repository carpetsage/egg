.PHONY: all init build dist fastbuild clean dev serve commit-donors

all: clean
	$(MAKE) dist

init:

build:
	yarn build

dist: build
	../_tools/build.py dist --additional assets --additional static

fastbuild: clean
	yarn fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist

dev:
	yarn dev

commit-donors:
	git add src/donors.ts
	git commit -m 'wasmegg/_home: update donors' src/donors.ts

serve:
	yarn serve
