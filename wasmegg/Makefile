MAKEFLAGS ?= -j4

targets = smart-assistant
init-targets = $(addprefix init-,$(targets))
clean-targets = $(addprefix clean-,$(targets))

.PHONY: all init clean $(targets) $(init-targets) $(clean-targets) update-loot-data

all: $(targets)

init: $(init-targets) update-loot-data

update-loot-data:
	#curl -o _common/loot/mission_reward_count.json https://api.ei.mikit.app/mission_reward_count.json

clean: $(clean-targets)

$(init-targets): init-%:
	$(MAKE) -C $(patsubst init-%,%,$@) init

$(targets): %:
	ets -s -f '[$@ %H:%M:%S]' $(MAKE) -C $@

$(clean-targets): clean-%:
	$(MAKE) -C $(patsubst clean-%,%,$@) clean
