import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id')
  if (deviceId) return deviceId

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx!.textBaseline = 'top'
  ctx!.font = '14px Arial'
  ctx!.fillText('fingerprint', 2, 2)
  const canvasData = canvas.toDataURL()

  const nav = navigator as any
  const parts = [
    canvasData,
    nav.userAgent,
    nav.platform,
    nav.language,
    nav.hardwareConcurrency || 0,
    nav.deviceMemory || 0,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset()
  ]
  const str = parts.join('|||')

  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  deviceId = 'dev_' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
  localStorage.setItem('device_id', deviceId)
  return deviceId
}
