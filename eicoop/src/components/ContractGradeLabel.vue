<template>
  <img :src="gradeIcon" class="h-6" />
</template>

<script lang="ts">
import { ei, iconURL } from 'lib';
import { defineComponent, PropType, toRefs } from 'vue';

export default defineComponent({
  props: {
    grade: {
      type: Number as PropType<ei.Contract.PlayerGrade>,
      required: true,
    },
  },
  setup(props) {
    const { grade } = toRefs(props);
    const gradeIcon =
      grade.value > ei.Contract.PlayerGrade.GRADE_UNSET
        ? iconURL(`egginc/contract_${ei.Contract.PlayerGrade[grade.value].toLowerCase()}.png`, 64)
        : iconURL(`egginc/contract_grade_c.png`, 64);
    return {
      gradeIcon,
      ei,
    };
  },
});
</script>

<style scoped>
.bg-standard {
  background-color: #3b6cbf;
}
</style>
