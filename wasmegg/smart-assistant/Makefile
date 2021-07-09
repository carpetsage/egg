.PHONY: all init build dist clean dev serve

all: clean
	$(MAKE) dist

init:

build:
	VITE_APP_BETA=1 yarn build

dist: build
	../_tools/build.py dist --additional assets --additional static

clean:
	@$(RM) -r dist

dev:
	yarn dev

serve:
	yarn serve
