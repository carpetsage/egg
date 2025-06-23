.PHONY: all init

all: ei.py ei.pb.go

init:
	pip install -r requirements.txt

ei.py: ../protobuf/ei.proto
	protoc -I . --python_betterproto_opt=pydantic_dataclasses --python_betterproto_out=. ei.proto
	mv ei/__init__.py ei.py
	rm __init__.py
	rmdir ei

ei.pb.go: ../protobuf/ei.proto
	protoc -I . --go_out=. --go_opt=paths=source_relative --go_opt=Mei.proto=github.com/carpetsage/egg/periodicals ei.proto
