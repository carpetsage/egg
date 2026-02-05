.PHONY: dev build preview type-check install clean help

# Default target
all: dev

## dev: Start development server
dev:
	npm run dev

## build: Build for production
build:
	npm run build

## preview: Preview production build locally
preview:
	npm run preview

## type-check: Run typescript type checking
type-check:
	npx vue-tsc --noEmit

## install: Install dependencies
install:
	npm install

## clean: Remove build artifacts
clean:
	rm -rf dist
	rm -rf node_modules/.vite

## help: Show this help message
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^##' Makefile | sed -e 's/## //g' | column -t -s ':'
