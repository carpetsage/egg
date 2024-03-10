MAKEFLAGS ?= -j9

targets = _home artifact-explorer artifact-sandbox consumption-sheet enlightenment events inventory-visualizer mission-list past-contracts proto-explorer researches rockets-tracker shell-company smart-assistant eggs-laid legendary-study mission-planner
init-targets = $(addprefix init-,$(targets))
fastbuild-targets = $(addprefix fastbuild-,$(targets))
clean-targets = $(addprefix clean-,$(targets))

.PHONY: all init clean $(targets) $(init-targets) $(clean-targets) update-loot-data

all: $(targets)
	netlify-headers-expander dist

init: $(init-targets) update-loot-data compactify-afx-data

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
