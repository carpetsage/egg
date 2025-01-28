.PHONY: all init

all: init ei_pb2.py

init:
	uv sync

ei_pb2.py: ../protobuf/ei.proto
	protoc --proto_path=. --python_out=. ei.proto
