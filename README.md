# Egg, Inc Helper Tools by @mk2, forked by @CarpetSage

If you're trying to learn to develop against the private Egg, Inc. API, look into [`protobuf/ei.proto`](protobuf/ei.proto) and [`lib/api`](lib/api) first.

If you want to contribute reach please reach out to me on discord first (@carpetsage). I am open to pull requests

If you want to build this yourself I suggest looking at the various Makefiles and the github build yamls in .github/workflows

Original Project: https://github.com/fanaticscripter/egg

How to set up build environment

1. Use Linux, MacOS, or a linux environment on windows (WSL or maybe git bash?) - I only have personal experience building directly on Linux
1. Install protoc: https://protobuf.dev/installation/
1. Install pnpm: https://pnpm.io/installation
1. Install ets: https://github.com/zmwangx/ets?tab=readme-ov-file#installation
1. Install make
1. cd to lib folder in root of project and run `make init` and `make`. This will install dependencies with pnpm and run protoc

How to build projects (usually not necessary except to run type checking before commiting)
1. Build all wasmegg projects: run `make` in wasmegg folder
1. Build individual project: run `make` in individual project folder

How to test while developing:
1. run `pnpm dev` in a project folder. This will run that page locally.
