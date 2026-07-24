<template>
  <spoiler-alert class="my-4" />
  <mission-selector :key="route.path" v-model="selectedMissionId" class="my-4" />
  <artifact-selector :key="route.path" v-model="selectedArtifactId" class="my-4" />
  <tank-artifact-selector :key="route.name" v-model="selectedTankArtifactIds" class="my-4" />
  <router-view name="mission" />
  <div class="my-4 text-xs text-red-900">
    <p class="font-medium">Artifact notes:</p>
    <p>
      * Certain effect values shown may be 1% higher than the corresponding in-game values; those are caused by
      erroneous floating point handling in the game, i.e. values here are correct.
    </p>
    <p>&dagger; Artifacts marked with &dagger; are not available from missions.</p>
  </div>
  <router-view name="artifact" />
  <router-view name="tank" />
  <artifact-grid />
</template>

<script lang="ts">
import { defineComponent, ref, PropType, toRefs, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { serializeTankIds } from '@/lib';
import { parseKnownTankIds } from '@/lib/filter';
import SpoilerAlert from '@/components/SpoilerAlert.vue';
import ArtifactGrid from '@/components/ArtifactGrid.vue';
import ArtifactSelector from '@/components/ArtifactSelector.vue';
import TankArtifactSelector from '@/components/TankArtifactSelector.vue';
import MissionSelector from '@/components/MissionSelector.vue';

export default defineComponent({
  components: {
    SpoilerAlert,
    ArtifactGrid,
    ArtifactSelector,
    TankArtifactSelector,
    MissionSelector,
  },
  props: {
    missionId: {
      type: String as PropType<string | null>,
      default: null,
    },
    artifactId: {
      type: String as PropType<string | null>,
      default: null,
    },
    tankPlannerArtifactId: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  setup(props) {
    const router = useRouter();
    const route = useRoute();
    const { missionId, artifactId, tankPlannerArtifactId } = toRefs(props);

    const selectedMissionId = ref(missionId.value);
    watch(missionId, current => {
      selectedMissionId.value = current;
    });
    watch(selectedMissionId, current => {
      if (current !== null) {
        router.push({
          name: 'mission',
          params: { missionId: current },
        });
      }
    });

    const selectedArtifactId = ref(artifactId.value);
    watch(artifactId, current => {
      selectedArtifactId.value = current;
    });
    watch(selectedArtifactId, current => {
      if (current !== null) {
        router.push({
          name: 'artifact',
          params: { artifactId: current },
        });
      }
    });

    const selectedTankArtifactIds = ref<string[]>(parseKnownTankIds(tankPlannerArtifactId.value));
    watch(tankPlannerArtifactId, current => {
      selectedTankArtifactIds.value = parseKnownTankIds(current);
    });
    watch(
      selectedTankArtifactIds,
      current => {
        if (current.length === 0) {
          // Removing the last chip has to leave the tank route: staying on
          // /tank/<id>/ would keep the planner rendering the artifact that was
          // just removed. Same destination FuelTankPlanner falls back to when
          // none of its ids resolve. Guarded on the route so clearing a
          // selection that was never in the URL doesn't navigate anywhere.
          if (route.name === 'tank') {
            router.replace({ name: 'home' });
          }
          return;
        }
        const serialized = serializeTankIds(current);
        // Already exactly what the URL says: nothing to do. This is the common
        // case on every load of a well-formed link, and skipping it here is
        // what lets the watcher run immediately without navigating to the
        // address it is already at.
        if (serialized === tankPlannerArtifactId.value) {
          return;
        }
        // The URL differs. Either it is a non-canonical spelling of this same
        // selection (`#/tank/a,a`, `#/tank/a,,b`, stray whitespace, an id that
        // names no artifact), or the user actually changed the selection.
        // Canonicalizing is a rewrite, not a navigation: pushing it would
        // leave the non-canonical entry one step back in history, where Back
        // lands, the param watcher re-normalizes, and we push forward again --
        // so the user could never get past it. Replace in that case; a genuine
        // selection change still pushes so Back undoes it.
        //
        // Running immediately matters because a link can arrive non-canonical.
        // Without it the URL would keep its stray commas or dead ids until the
        // user happened to add or remove a chip.
        const sameSelection = serialized === serializeTankIds(parseKnownTankIds(tankPlannerArtifactId.value));
        const navigate = sameSelection ? router.replace : router.push;
        navigate({
          name: 'tank',
          params: { tankPlannerArtifactId: serialized },
        });
      },
      { immediate: true }
    );

    return {
      route,
      selectedMissionId,
      selectedArtifactId,
      selectedTankArtifactIds,
    };
  },
});
</script>
