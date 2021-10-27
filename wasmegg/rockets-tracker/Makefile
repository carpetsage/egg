.PHONY: all init build dist clean dev serve

all: clean
	$(MAKE) dist

init:

build: src/lib/study_stats.ts
	yarn build

# The EIAPI_TOKEN environment variable has to be set. Use the -fake flag to
# generate with preset values without querying the API.
src/lib/study_stats.ts:
	go run tools/study_stats/main.go

dist: build
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist src/lib/study_stats.ts

dev:
	yarn dev

serve:
	yarn serve
