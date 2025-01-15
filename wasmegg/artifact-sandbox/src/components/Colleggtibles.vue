<template>
    <div class="max-w-xs mx-auto my-4">
        <h3 class="my-2 text-center text-sm font-medium uppercase">Colleggtibles</h3>

        <div class="mt-4 flex justify-center">
            <div class="space-y-0.5">

                <div class="relative flex items-center justify-end">
                <label 
                    v-tippy="{content: '1%, 2%, 3%, or 5%'}"
                    for="carbonfiber_colleggtible" class="flex items-center text-sm whitespace-nowrap mr-2">
                        <img
                        :src="iconURL('egginc/egg_carbonfiber.png', 64)"
                        class="h-8 w-8 relative -top-px mr-px"
                        />
                        Shipping capacity<sup class="px-0.5">?</sup>
                    </label>
                    <integer-input
                    id="carbonfiber_colleggtible"
                        :model-value="round(conf.carbonFiberColleggtible * 100)" 
                        :min="0"
                        :max="5"
                        base-class="w-20 pl-2.5 pt-1 pb-0.5"
                        @update:model-value="value => (conf.carbonFiberColleggtible = value / 100)"
                    />
                    <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">
                        %
                    </div>
                </div>

                <div class="relative flex items-center justify-end">
                <label 
                    v-tippy="{content: '25%, 50%, 200%, or 300%'}"
                    for="chocolate_colleggtible" class="flex items-center text-sm whitespace-nowrap mr-2">
                        <img
                        :src="iconURL('egginc/egg_chocolate.png', 64)"
                        class="h-8 w-8 relative -top-px mr-px"
                        />
                        Away earnings<sup class="px-0.5">?</sup>
                    </label>
                    <integer-input
                    id="chocolate_colleggtible"
                        :model-value="round(conf.chocolateColleggtible * 100)" 
                        :min="0"
                        :max="300"
                        base-class="w-20 pl-2.5 pt-1 pb-0.5"
                        @update:model-value="value => (conf.chocolateColleggtible = value / 100)"
                    />
                    <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">
                        %
                    </div>
                </div>

                <div class="relative flex items-center justify-end">
                <label 
                    v-tippy="{content: '1%, 2%, 3%, or 5%'}"
                    for="easter_colleggtible" class="flex items-center text-sm whitespace-nowrap mr-2">
                        <img
                        :src="iconURL('egginc/egg_easter.png', 64)"
                        class="h-8 w-8 relative -top-px mr-px"
                        />
                        Internal hatchery rate<sup class="px-0.5">?</sup>
                    </label>
                    <integer-input
                    id="easter_colleggtible"
                        :model-value="round(conf.easterColleggtible * 100)" 
                        :min="0"
                        :max="5"
                        base-class="w-20 pl-2.5 pt-1 pb-0.5"
                        @update:model-value="value => (conf.easterColleggtible = value / 100)"
                    />
                    <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">
                        %
                    </div>
                </div>                

                <div class="relative flex items-center justify-end">
                <label 
                    v-tippy="{content: '1%, 2%, 3%, or 5%'}"
                    for="firework_colleggtible" class="flex items-center text-sm whitespace-nowrap mr-2">
                        <img
                        :src="iconURL('egginc/egg_firework.png', 64)"
                        class="h-8 w-8 relative -top-px mr-px"
                        />
                        Earnings<sup class="px-0.5">?</sup>
                    </label>
                    <integer-input
                    id="firework_colleggtible"
                        :model-value="round(conf.fireworkColleggtible * 100)" 
                        :min="0"
                        :max="5"
                        base-class="w-20 pl-2.5 pt-1 pb-0.5"
                        @update:model-value="value => (conf.fireworkColleggtible = value / 100)"
                    />
                    <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">
                        %
                    </div>
                </div>                

                <div class="relative flex items-center justify-end">
                <label 
                    v-tippy="{content: '1%, 2%, 3%, or 5%'}"
                    for="pumpkin_colleggtible" class="flex items-center text-sm whitespace-nowrap mr-2">
                        <img
                        :src="iconURL('egginc/egg_pumpkin.png', 64)"
                        class="h-8 w-8 relative -top-px mr-px"
                        />
                        Shipping capacity<sup class="px-0.5">?</sup>
                    </label>
                    <integer-input
                    id="pumpkin_colleggtible"
                        :model-value="round(conf.pumpkinColleggtible * 100)" 
                        :min="0"
                        :max="5"
                        base-class="w-20 pl-2.5 pt-1 pb-0.5"
                        @update:model-value="value => (conf.pumpkinColleggtible = value / 100)"
                    />
                    <div class="absolute inset-y-0.5 right-0 pr-2.5 pt-1 pb-0.5 sm:text-sm text-gray-200">
                        %
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>
  
  <script lang="ts">
  import { defineComponent, ref, toRefs, watch } from 'vue';
  
  import { iconURL } from 'lib';
  import { Config } from '@/lib';
  import IntegerInput from '@/components/IntegerInput.vue';
  
  export default defineComponent({
    components: {
      IntegerInput,
    },
    props: {
      config: {
        type: Config,
        required: true,
      },
    },
    emits: {
      'update:config': (_payload: Config) => true,
    },
    setup(props, { emit }) {
      const { config } = toRefs(props);
      const conf = ref(config.value);
      watch(
        conf,
        () => {
          emit('update:config', conf.value);
        },
        { deep: true }
      );
      return {
        conf,
        round,
        iconURL,
      };
    },
  });
  
  function round(x: number): number {
    return Math.round(x);
  }
  </script>
  
  <style scoped>
  sup {
    color: #a6a6a6;
  }
  </style>
  