<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: string }>()
</script>

<template>
  <div :class="cn('relative w-full overflow-hidden rounded-full bg-secondary', props.class)">
    <div class="h-full bg-primary transition-all duration-300 ease-in-out" :style="{ width: `${$attrs.modelValue || 0}%` }" />
  </div>
</template>
