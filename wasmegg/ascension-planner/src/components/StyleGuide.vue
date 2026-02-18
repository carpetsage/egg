<template>
  <div
    class="fixed left-0 top-1/2 -translate-y-1/2 z-50 transition-all duration-500 ease-in-out"
    :class="isOpen ? 'translate-x-0' : '-translate-x-[calc(100%-2.5rem)]'"
  >
    <div class="flex items-start">
      <!-- Main Content Container -->
      <div class="card-glass w-85 max-h-[85vh] overflow-y-auto p-7 shadow-2xl backdrop-blur-xl border-white/50">
        <header class="mb-8">
          <h2 class="heading-xl text-gradient mb-1">Design System</h2>
          <p class="text-xs font-semibold text-slate-400">ASCENSION PLANNER UI v1.0</p>
        </header>

        <!-- Color Palette -->
        <section class="mb-10">
          <h3 class="style-guide-label">Color Palette</h3>
          <div class="grid grid-cols-4 gap-3">
            <div v-for="color in colors" :key="color.name" class="flex flex-col items-center gap-1.5">
              <div 
                class="h-12 w-full rounded-xl shadow-inner border border-black/5" 
                :style="{ backgroundColor: `var(--color-${color.var})` }"
              ></div>
              <span class="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{{ color.name }}</span>
            </div>
          </div>
        </section>

        <!-- Typography -->
        <section class="mb-10">
          <h3 class="style-guide-label">Typography</h3>
          <div class="space-y-4">
            <div>
              <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">Heading XL (Gradient)</p>
              <h1 class="heading-xl text-gradient">The Future is Here</h1>
            </div>
            <div>
              <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">Mono Tabular (Stats)</p>
              <div class="font-mono-premium text-lg text-slate-700">1,234,567,890.000</div>
            </div>
          </div>
        </section>

        <!-- Buttons -->
        <section class="mb-10">
          <h3 class="style-guide-label">Interactive Elements</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <button class="btn-premium btn-primary text-xs py-2.5">
                <span>Primary Action</span>
              </button>
              <button class="btn-premium btn-secondary text-xs py-2.5">
                <span>Secondary</span>
              </button>
            </div>
            <button class="btn-premium btn-ghost w-full justify-between group">
              <span>Ghost Action</span>
              <svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>

        <!-- Inputs -->
        <section class="mb-10">
          <h3 class="style-guide-label">Forms & Inputs</h3>
          <div class="space-y-4">
            <!-- Standard Text Input -->
            <div>
              <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block ml-1">Player Identifier</label>
              <input type="text" class="input-premium" placeholder="e.g. EI123456789" v-model="demoText" />
              <p class="text-[10px] text-slate-400 mt-1.5 ml-1 italic transition-all" :class="{ 'text-brand-primary font-bold': demoText }">
                Live Preview: {{ demoText || 'Awaiting input...' }}
              </p>
            </div>

            <div class="relative group">
              <input type="text" class="input-premium pl-10" placeholder="Search parameters..." />
              <svg class="w-5 h-5 absolute left-3 top-2.5 text-slate-400 group-focus-within:text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div class="flex items-center gap-3 bg-white/50 p-3 rounded-xl border border-dashed border-slate-200 hover:bg-white/80 transition-colors">
              <input type="checkbox" class="checkbox-premium" id="guide-check" checked />
              <label for="guide-check" class="text-sm font-medium text-slate-600 select-none">Enable Advanced Analytics</label>
            </div>
          </div>
        </section>

        <!-- Badges & Indicators -->
        <section>
          <h3 class="style-guide-label">Badges & Tags</h3>
          <div class="flex flex-wrap gap-2">
            <span class="badge-premium badge-brand">Trending</span>
            <span class="badge-premium badge-success">Optimized</span>
            <span class="badge-premium bg-amber-100 text-amber-700">Legendary</span>
            <div class="animate-float">
              <span class="badge-premium bg-purple-500 text-white shadow-lg shadow-purple-200">Featured</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Sidebar Toggle Tab -->
      <div 
        @click="isOpen = !isOpen"
        class="bg-white/90 backdrop-blur-md h-40 w-10 flex flex-col items-center justify-center rounded-r-2xl border-y border-r border-white/50 shadow-xl cursor-pointer hover:bg-white transition-colors group mt-10"
      >
        <div class="flex flex-col items-center gap-1">
          <div 
            class="w-1 h-1 rounded-full bg-slate-300 transition-all group-hover:bg-brand-primary"
            :class="{ 'scale-150 bg-brand-primary': isOpen }"
          ></div>
          <div 
            class="w-1 h-6 rounded-full bg-slate-200 transition-all group-hover:bg-brand-primary"
            :class="{ 'h-1 w-1 bg-brand-primary': isOpen }"
          ></div>
          <div 
            class="w-1 h-1 rounded-full bg-slate-300 transition-all group-hover:bg-brand-primary"
            :class="{ 'scale-150 bg-brand-primary': isOpen }"
          ></div>
        </div>
        
        <div class="absolute -right-16 rotate-90 whitespace-nowrap">
          <span class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-brand-primary transition-colors">
            Style Guide
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isOpen = ref(false);
const demoText = ref('');

const colors = [
  { name: 'Brand', var: 'brand-primary' },
  { name: 'Accent', var: 'brand-accent' },
  { name: 'Gold', var: 'brand-secondary' },
  { name: 'Success', var: 'success' },
  { name: 'Danger', var: 'danger' },
  { name: 'Info', var: 'info' },
  { name: 'Slate', var: 'slate-600' },
  { name: 'App Bg', var: 'slate-100' },
];
</script>

<style scoped>
.style-guide-label {
  @apply text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2;
}

.style-guide-label::after {
  content: '';
  @apply h-[1px] flex-1 bg-slate-100;
}

.w-85 {
  width: 21rem;
}

/* Custom scrollbar for style guide */
.card-glass::-webkit-scrollbar {
  width: 4px;
}
.card-glass::-webkit-scrollbar-track {
  background: transparent;
}
.card-glass::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded-full hover:bg-slate-300;
}
</style>
