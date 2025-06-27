.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build:
	pnpm build

# The EIAPI_TOKEN environment variable has to be set. Use the -fake flag to
# generate with preset values without querying the API.
src/lib/study_stats.ts:
	go run tools/study_stats/main.go -fake

dist: build
	../_tools/build.py dist --additional assets --additional static

fastbuild:
	pnpm fastbuild
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist

dev:
	pnpm dev

serve:
	pnpm serve
