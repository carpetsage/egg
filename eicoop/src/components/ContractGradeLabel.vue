<template>
  <img :src="gradeIcons[grade]" class="h-6" />
</template>

<script lang="ts">
import { ei } from 'lib'
import { defineComponent, PropType } from 'vue';

// colors for grades in order none,c,b,a,aa,aaa
const gradeIcons = [
 "/contract_grade_c.png",
 "/contract_grade_c.png",
 "/contract_grade_b.png",
 "/contract_grade_a.png",
 "/contract_grade_aa.png",
 "/contract_grade_aaa.png",
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
      gradeIcons,
    };
  },
});
</script>

<style scoped>
.bg-standard {
  background-color: #3b6cbf;
}
</style>
