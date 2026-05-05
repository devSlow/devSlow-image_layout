import { ref, type Ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

declare global {
  interface Window {
    __toast_state?: { toasts: Ref<Toast[]>; nextId: number }
  }
}

if (!window.__toast_state) {
  window.__toast_state = { toasts: ref<Toast[]>([]), nextId: 0 }
}

const toasts = window.__toast_state.toasts
let nextId = 0

export { toasts }

export function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

function add(message: string, type: ToastType = 'info', duration: number = 3000) {
  const id = `toast-${Date.now()}-${nextId++}`
  toasts.value = [...toasts.value, { id, message, type }]
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }
}

export function useToast() {
  return {
    toasts,
    remove: removeToast,
    success: (msg: string, duration?: number) => add(msg, 'success', duration),
    error: (msg: string, duration?: number) => add(msg, 'error', duration),
    warning: (msg: string, duration?: number) => add(msg, 'warning', duration),
    info: (msg: string, duration?: number) => add(msg, 'info', duration)
  }
}

export const toast = useToast()
