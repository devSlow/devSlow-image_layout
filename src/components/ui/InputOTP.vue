<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: string
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const digits = ref<string[]>(Array(6).fill(''))
const inputs = ref<HTMLInputElement[]>([])

watch(() => props.modelValue, (val) => {
  if (val) {
    digits.value = val.split('').concat(Array(6).fill('')).slice(0, 6)
  }
})

function handleInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '')
  
  if (value.length > 1) {
    // 粘贴多位数
    const chars = value.split('').slice(0, 6)
    chars.forEach((ch, i) => {
      digits.value[i] = ch
    })
    emit('update:modelValue', digits.value.join(''))
    if (chars.length < 6) {
      nextTick(() => inputs.value[chars.length]?.focus())
    }
    return
  }
  
  digits.value[index] = value
  emit('update:modelValue', digits.value.join(''))
  
  if (value && index < 5) {
    nextTick(() => inputs.value[index + 1]?.focus())
  }
}

function handleKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    nextTick(() => inputs.value[index - 1]?.focus())
  }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault()
  const paste = event.clipboardData?.getData('text') || ''
  const cleaned = paste.replace(/\D/g, '').slice(0, 6)
  if (!cleaned) return
  
  const chars = cleaned.split('')
  chars.forEach((ch, i) => {
    digits.value[i] = ch
  })
  emit('update:modelValue', digits.value.join(''))
  
  nextTick(() => {
    const nextIndex = Math.min(chars.length, 5)
    inputs.value[nextIndex]?.focus()
  })
}
</script>

<template>
  <div :class="cn('flex gap-2', props.class)">
    <input
      v-for="(_, i) in 6"
      :key="i"
      ref="inputs"
      type="text"
      inputmode="numeric"
      maxlength="1"
      :value="digits[i]"
      @input="handleInput(i, $event)"
      @keydown="handleKeydown(i, $event)"
      @paste="handlePaste"
      class="w-12 h-14 text-center text-2xl font-bold border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
    />
  </div>
</template>
