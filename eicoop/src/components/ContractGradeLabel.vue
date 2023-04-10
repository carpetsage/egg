<template>
  <span class="px-2.5 py-0.5 rounded-full text-xs font-medium text-white" :class="gradeColor[grade]">
    {{ grade !== PlayerGrade.GRADE_UNSET ? PlayerGrade[grade] : 'Unknown' }}
  </span>
</template>

<script lang="ts">
import { ei } from 'lib'
import { defineComponent, PropType } from 'vue';

// colors for grades in order none,c,b,a,aa,aaa
const gradeColor = [
 'bg-pink-600',
 'bg-orange-600',
 'bg-green-600',
 'bg-blue-600',
 'bg-purple-600',
 'bg-pink-600',
]

export default defineComponent({
  props: {
    grade: {
      type: Number as PropType<ei.Contract.PlayerGrade>,
      required: true,
    },
  },
  setup() {
    return {
      PlayerGrade: ei.Contract.PlayerGrade,
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
