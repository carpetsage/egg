.PHONY: all clean

all: updater

updater:
	GOFLAGS=-trimpath go build -o updater

clean:
	@$(RM) updater
