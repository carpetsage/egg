<template>
  <span class="px-2.5 py-0.5 rounded-full text-xs font-medium text-white" :class="gradeColor(grade)">
    {{ grade === grade ? String(ContractGrade) : 'Unkown' }}
  </span>
</template>

<script lang="ts">
import { ei } from 'lib'
import { defineComponent, PropType } from 'vue';

export function gradeColor(grade: ei.Contract.PlayerGrade): string {
  switch (grade) {
    case ei.Contract.PlayerGrade.GRADE_AAA:
      return 'bg-purple-600'
    case ei.Contract.PlayerGrade.GRADE_AA:
      return 'bg-green-600'
    case ei.Contract.PlayerGrade.GRADE_A:
      return 'bg-blue-600'
    case ei.Contract.PlayerGrade.GRADE_B:
      return 'bg-green-600'
    case ei.Contract.PlayerGrade.GRADE_C:
      return 'bg-purple-600'
    default:
      return 'bg-purple-600'
  }
}
export default defineComponent({
  props: {
    grade: {
      type: Number as PropType<ei.Contract.PlayerGrade>,
      required: true,
    },
  },
  setup() {
    return {
      ContractGrade: ei.Contract.PlayerGrade,
      gradeColor,
    };
  },
});
</script>

<style scoped>
.bg-standard {
  background-color: #3b6cbf;
}
</style>
