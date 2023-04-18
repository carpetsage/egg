.PHONY: all init

all: ei.py

init:
	pip install -r requirements.txt

ei.py: ../protobuf/ei.proto
	protoc -I . --python_betterproto_opt=pydantic_dataclasses --python_betterproto_out=. ei.proto
	mv ei/__init__.py ei.py
	rm __init__.py
	rmdir ei
