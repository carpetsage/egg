.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build: src/lib/study_stats.ts
	pnpm build

# The EIAPI_TOKEN environment variable has to be set. Use the -fake flag to
# generate with preset values without querying the API.
src/lib/study_stats.ts:
	go run tools/study_stats/main.go -fake

dist: build
	../_tools/build.py dist --additional assets --additional static

fastbuild: src/lib/study_stats.ts
	pnpm fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist src/lib/study_stats.ts

dev:
	pnpm dev

serve:
	pnpm serve
