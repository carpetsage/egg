MAKEFLAGS ?= -j9

targets = _home rockets-tracker
init-targets = $(addprefix init-,$(targets))
fastbuild-targets = $(addprefix fastbuild-,$(targets))
clean-targets = $(addprefix clean-,$(targets))

.PHONY: all init clean $(targets) $(init-targets) $(clean-targets)

all: $(targets)
	netlify-headers-expander dist

init: $(init-targets)

fastbuild: $(fastbuild-targets)
	netlify-headers-expander dist

update-loot-data:
	./artifact-explorer/update-loot-data.sh

compactify-afx-data:
	find . -type f -iname '*.json' -exec ./_tools/compactify.sh '{}' \;

clean: $(clean-targets)

$(init-targets): init-%:
	ets -s -f '[$@ %H:%M:%S]' $(MAKE) -C $(patsubst init-%,%,$@) init

$(targets): %:
	ets -s -f '[$@ %H:%M:%S]' $(MAKE) -C $@

$(fastbuild-targets): fastbuild-%:
	ets -s -f '[$(patsubst fastbuild-%,%,$@) %H:%M:%S]' $(MAKE) -C $(patsubst fastbuild-%,%,$@) fastbuild

$(clean-targets): clean-%:
	$(MAKE) -C $(patsubst clean-%,%,$@) clean
