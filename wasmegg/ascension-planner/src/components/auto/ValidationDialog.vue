<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          @click="close"
        />
        
        <!-- Dialog -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div 
            class="relative w-full max-w-lg bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20"
          >
            <!-- Header -->
            <div class="bg-gradient-to-br from-rose-500 to-rose-600 px-8 py-10 text-white relative overflow-hidden">
              <!-- Decorative background elements -->
              <div class="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div class="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-rose-400/20 rounded-full blur-2xl pointer-events-none" />
              
              <div class="relative flex items-center gap-6">
                <div class="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 shadow-xl">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-[10px] font-black text-rose-100 uppercase tracking-[0.2em] mb-1">Validation Error</h3>
                  <div class="text-2xl font-black tracking-tight leading-tight">Invalid Target TE</div>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div class="p-8 pb-10 space-y-8">
              <div class="bg-slate-50 border border-slate-200/60 rounded-3xl p-8 relative group">
                <div class="absolute -top-3 left-6 px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                  System Message
                </div>
                <p class="text-[15px] font-bold text-slate-700 leading-relaxed italic">
                  "{{ message }}"
                </p>
              </div>

              <div class="space-y-4">
                <div class="flex items-start gap-4 p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50 transition-colors hover:bg-amber-50/80">
                  <div class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p class="text-xs font-bold text-amber-900/80 leading-relaxed">
                    Ascension plans must always result in a <span class="text-amber-700">positive gain</span> of Truth Eggs. You cannot target a value lower than or equal to what you have already earned.
                  </p>
                </div>
              </div>

              <!-- Footer/Actions -->
              <div class="flex justify-end pt-2">
                <button 
                  @click="close"
                  class="group relative px-10 py-4 bg-slate-900 text-white overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-slate-200"
                >
                  <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span class="relative text-[11px] font-black uppercase tracking-[0.2em]">Okay</span>
                </button>
              </div>
            </div>

            <!-- Close button in corner -->
            <button 
              @click="close"
              class="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean;
  message: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const close = () => emit('close');
</script>

<style scoped>
.font-mono-premium {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
</style>
