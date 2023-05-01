.PHONY: all fastbuild clean

all: public/contractListHash
	pnpm build
	netlify-headers-expander dist

fastbuild: public/contractListHash
	pnpm fastbuild
	netlify-headers-expander dist

public/contractListHash:
	jq -cjM '[.[].id]' ../periodicals/data/contracts.json | \
		python3 -c 'import sys, hashlib; print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())' \
		>public/contractListHash

clean:
	@$(RM) -r dist
