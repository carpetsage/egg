.PHONY: all commit clean

all: updater

updater:
	GOFLAGS=-trimpath go build -o updater

commit:
	git add .
	git commit -m 'contracts: update data/contracts.json'

clean:
	@$(RM) updater
