<template>
  <player-card :backup="backup" :inventory="inventory" :event-bus="eventBus" />

  <collapsible-section
    section-title="Active missions"
    :visible="isVisibleSection('active-missions')"
    @toggle="toggleSectionVisibility('active-missions')"
  >
    <active-missions-report :active-missions="activeMissions" :backup="backup" />
  </collapsible-section>

  <collapsible-section
    section-title="Mission statistics"
    :visible="isVisibleSection('mission-statistics')"
    @toggle="toggleSectionVisibility('mission-statistics')"
  >
    <mission-statistics-report :artifacts-d-b="artifactsDB" :progress="progress" :virtue="virtue" />
  </collapsible-section>

  <collapsible-section
    section-title="Launch log"
    :visible="isVisibleSection('launch-log')"
    @toggle="toggleSectionVisibility('launch-log')"
  >
    <launch-log :user-id="playerId" :artifacts-d-b="artifactsDB" />
  </collapsible-section>

  <collapsible-section
    section-title="Artifact loadouts"
    :visible="isVisibleSection('artifact-loadouts')"
    @toggle="toggleSectionVisibility('artifact-loadouts')"
  >
    <artifact-loadouts-report :backup="backup" />
  </collapsible-section>

  <collapsible-section
    section-title="Artifacting progress"
    :visible="isVisibleSection('artifacting-progress')"
    @toggle="toggleSectionVisibility('artifacting-progress')"
  >
    <artifacting-progress-report :player-id="playerId" :inventory="inventory" :backup="backup" />
  </collapsible-section>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue';
import { Emitter } from 'mitt';

import { ei, Inventory, requestFirstContact, UserBackupEmptyError, virtueEggs } from 'lib';
import { useSectionVisibility } from 'ui/composables/section_visibility';
import { reportLegendaries, reportMissionData } from '@/lib';
import { REPORT_LEGENDARIES, REPORT_MISSIONDATA } from '@/events';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import PlayerCard from '@/components/PlayerCard.vue';
import ActiveMissionsReport from '@/components/ActiveMissionsReport.vue';
import MissionStatisticsReport from '@/components/MissionStatisticsReport.vue';
import LaunchLog from '@/components/LaunchLog.vue';
import ArtifactLoadoutsReport from '@/components/ArtifactLoadoutsReport.vue';
import ArtifactingProgressReport from '@/components/ArtifactingProgressReport.vue';

export default defineComponent({
  components: {
    CollapsibleSection,
    PlayerCard,
    ActiveMissionsReport,
    MissionStatisticsReport,
    LaunchLog,
    ArtifactLoadoutsReport,
    ArtifactingProgressReport,
  },
  props: {
    playerId: {
      type: String,
      required: true,
    },
    eventBus: {
      type: Object as PropType<Emitter<Record<typeof REPORT_LEGENDARIES | typeof REPORT_MISSIONDATA, unknown>>>,
      required: true,
    },
  },
  // This async component does not respond to playerId changes.

  async setup({ playerId, eventBus }) {
    const data = await requestFirstContact(playerId);
    if (!data.backup || !data.backup.game) {
      throw new UserBackupEmptyError(playerId);
    }
    const backup = data.backup;
    const progress = data.backup.game;
    const egg = backup.farms?.at(0)?.eggType || ei.Egg.UNKNOWN;
    const virtue = virtueEggs.includes(egg);
    if (!backup.settings) {
      throw new Error(`${playerId}: settings not found in backup`);
    }
    const artifactsDB = backup.artifactsDb;
    if (!artifactsDB) {
      throw new Error(`${playerId}: no artifacts database in backup`);
    }
    const inventory = computed(() => new Inventory(artifactsDB));
    const activeMissions =
      (artifactsDB.missionInfos ?? [])
        .concat(artifactsDB.fuelingMission ?? [])
        .concat(artifactsDB.virtueAfxDb?.fuelingMission ?? []) || [];
    const { isVisibleSection, toggleSectionVisibility } = useSectionVisibility();
    reportLegendaries(backup);
    eventBus.on(REPORT_LEGENDARIES, () => {
      reportLegendaries(backup);
    });
    reportMissionData(backup);
    eventBus.on(REPORT_MISSIONDATA, () => {
      reportMissionData(backup);
    });
    return {
      backup,
      virtue,
      progress,
      artifactsDB,
      inventory,
      activeMissions,
      isVisibleSection,
      toggleSectionVisibility,
    };
  },
});
</script>
