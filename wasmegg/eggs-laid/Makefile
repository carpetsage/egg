.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build: 
	yarn build

dist: build
	../_tools/build.py dist --additional assets --additional static

fastbuild: src/lib/study_stats.ts
	yarn fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist

dev:
	yarn dev

serve:
	yarn serve
