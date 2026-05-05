<script setup lang="ts">
import { toasts, removeToast } from '@/composables/useToast'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-vue-next'

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

const colorMap = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
}

const iconColorMap = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500'
}
</script>

<template>
  <div class="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 max-w-md w-full px-4 pointer-events-none">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="flex items-center gap-2.5 px-5 py-3 rounded-lg border shadow-lg"
      :class="colorMap[t.type as keyof typeof colorMap]"
    >
      <component
        :is="iconMap[t.type as keyof typeof iconMap]"
        class="w-5 h-5 shrink-0"
        :class="iconColorMap[t.type as keyof typeof iconColorMap]"
      />
      <p class="text-sm font-medium leading-snug">{{ t.message }}</p>
    </div>
  </div>
</template>
