.PHONY: all init build dist fastbuild clean dev serve

all: clean
	$(MAKE) dist

init:

build: doc
	yarn build

doc:
	mkdir -p public/doc
	protoc --doc_out=html,index.html:./public/doc --proto_path ../../protobuf ../../protobuf/*.proto

dist: build
	../_tools/build.py dist --additional assets --additional static --additional doc

fastbuild: doc
	yarn fastbuild
	../_tools/build.py dist --additional assets --additional static --additional doc

clean:
	@$(RM) -r public/doc dist

dev:
	yarn dev

serve:
	yarn serve
