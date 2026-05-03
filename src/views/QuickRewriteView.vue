<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Wand2, Copy, RefreshCw, Sparkles, FileText, ArrowRightLeft, Check, Clock } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import { rewriteText, scoreParagraph, getRemainingUsage } from '@/api/document'
import type { ScoreResult } from '@/api/types'

const router = useRouter()

const inputText = ref('')
const rewrittenText = ref('')
const isRewriting = ref(false)
const roundInfo = ref('')
const scoreResult = ref<ScoreResult | null>(null)
const errorMessage = ref('')
const copied = ref(false)
const remainCount = ref<number | null>(null)

const scoreDimensions: { key: Exclude<keyof ScoreResult, 'total' | 'level'>; label: string; max: number }[] = [
  { key: 'directness', label: '直接度', max: 10 },
  { key: 'rhythm', label: '节奏感', max: 10 },
  { key: 'trustworthiness', label: '可信度', max: 10 },
  { key: 'authenticity', label: '真实度', max: 10 },
  { key: 'conciseness', label: '简洁度', max: 10 },
  { key: 'semanticFidelity', label: '语义保真', max: 10 },
  { key: 'purity', label: '纯净度', max: 10 }
]

function getDeviceId() {
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

onMounted(() => {
  const did = getDeviceId()
  getRemainingUsage(did).then(res => {
    remainCount.value = res.data.remain
  }).catch(() => {
    remainCount.value = 10
  })
})

const charCount = computed(() => inputText.value.length)
const outputCharCount = computed(() => rewrittenText.value.length)
const charDiff = computed(() => {
  if (!inputText.value || !rewrittenText.value) return 0
  return Math.round(((outputCharCount.value - charCount.value) / charCount.value) * 100)
})

async function handleRewrite() {
  if (!inputText.value.trim()) {
    errorMessage.value = '请输入需要降重的文本'
    return
  }
  if (inputText.value.trim().length < 10) {
    errorMessage.value = '文本至少需要10个字符'
    return
  }

  errorMessage.value = ''
  rewrittenText.value = ''
  scoreResult.value = null
  isRewriting.value = true

  try {
    const deviceId = getDeviceId()

    roundInfo.value = '正在进行第一轮润色...'
    const res1 = await rewriteText(inputText.value.trim(), deviceId, 1)
    const round1Text = res1.data.rewrittenText

    if (!round1Text) {
      errorMessage.value = '第一轮润色失败，请重试'
      isRewriting.value = false
      return
    }

    roundInfo.value = '正在进行第二轮润色...'
    const res2 = await rewriteText(round1Text, deviceId, 2)

    if (res2.data.rewrittenText) {
      rewrittenText.value = res2.data.rewrittenText
    } else {
      rewrittenText.value = round1Text
    }

    roundInfo.value = '正在计算质量评分...'
    try {
      const scoreRes = await scoreParagraph('quick', 'quick', inputText.value.trim(), rewrittenText.value)
      scoreResult.value = scoreRes.data
    } catch {
      scoreResult.value = null
    }

    roundInfo.value = '润色完成！'
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || '润色失败，请重试'
  } finally {
    isRewriting.value = false
  }
}

function handleCopy() {
  navigator.clipboard.writeText(rewrittenText.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function handleReset() {
  inputText.value = ''
  rewrittenText.value = ''
  scoreResult.value = null
  roundInfo.value = ''
  errorMessage.value = ''
}

function getScoreColor(score: number, max: number) {
  const ratio = score / max
  if (ratio >= 0.8) return 'text-green-500'
  if (ratio >= 0.6) return 'text-yellow-500'
  return 'text-red-500'
}

function getScoreBarColor(score: number, max: number) {
  const ratio = score / max
  if (ratio >= 0.8) return 'bg-green-500'
  if (ratio >= 0.6) return 'bg-yellow-500'
  return 'bg-red-500'
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/10">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <button @click="router.push('/')" class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft class="w-4 h-4" />
          <span class="text-sm">返回</span>
        </button>
        <div class="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <router-link to="/quick" class="px-3 py-1.5 text-xs font-medium rounded-md bg-background text-foreground shadow-sm">
            快速降重
          </router-link>
          <router-link to="/upload" class="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">
            上传文档
          </router-link>
        </div>
        <div class="flex items-center gap-2">
          <Clock class="w-4 h-4 text-muted-foreground" />
          <span class="text-xs text-muted-foreground">剩余</span>
          <span class="text-sm font-bold" :class="remainCount !== null && remainCount > 0 ? 'text-primary' : 'text-destructive'">{{ remainCount ?? '-' }}</span>
          <span class="text-xs text-muted-foreground">次</span>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-6xl mx-auto px-4 py-8">
      <!-- Empty state -->
      <div v-if="!rewrittenText && !isRewriting && !errorMessage" class="text-center py-16">
        <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <FileText class="w-8 h-8 text-primary" />
        </div>
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight">粘贴文本，立即降重</h1>
        <p class="mt-3 text-muted-foreground max-w-md mx-auto">
          复制需要降重的段落粘贴到下方文本框，AI 将自动进行两轮润色优化
        </p>
      </div>

      <div v-if="errorMessage" class="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        {{ errorMessage }}
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- Input Panel -->
        <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-blue-500"></div>
              <span class="text-sm font-medium">原始文本</span>
            </div>
            <span class="text-xs text-muted-foreground">{{ charCount }} 字</span>
          </div>
          <textarea
            v-model="inputText"
            :disabled="isRewriting"
            placeholder="请粘贴需要降重的段落文本..."
            class="w-full h-72 p-4 text-sm resize-none focus:outline-none bg-transparent"
          />
          <div class="px-4 py-3 border-t bg-muted/30 flex justify-end">
            <Button @click="handleRewrite" :disabled="isRewriting || !inputText.trim()" class="text-sm">
              <Wand2 class="w-4 h-4 mr-1.5" />
              {{ isRewriting ? '润色中...' : '开始润色' }}
            </Button>
          </div>
        </div>

        <!-- Output Panel -->
        <div class="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
              <span class="text-sm font-medium">润色结果</span>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="roundInfo" class="text-xs text-muted-foreground">{{ roundInfo }}</span>
              <span v-if="rewrittenText" class="text-xs text-muted-foreground">{{ outputCharCount }} 字</span>
              <button
                v-if="rewrittenText"
                @click="handleCopy"
                class="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors"
              >
                <Check v-if="copied" class="w-3.5 h-3.5 text-green-500" />
                <Copy v-else class="w-3.5 h-3.5 text-muted-foreground" />
                <span class="text-xs" :class="copied ? 'text-green-500' : 'text-muted-foreground'">{{ copied ? '已复制' : '复制' }}</span>
              </button>
            </div>
          </div>
          <div class="relative">
            <textarea
              :value="rewrittenText || ''"
              readonly
              :placeholder="isRewriting ? 'AI 正在处理中...' : '润色结果将显示在这里'"
              class="w-full h-72 p-4 text-sm resize-none focus:outline-none bg-transparent"
            />
            <!-- Loading overlay -->
            <div v-if="isRewriting" class="absolute inset-0 flex items-center justify-center bg-white/95 dark:bg-slate-900/95 z-10 rounded-xl">
              <div class="flex flex-col items-center gap-4">
                <div class="relative">
                  <div class="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
                  <div class="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
                <div class="text-center">
                  <p class="text-sm font-semibold">{{ roundInfo }}</p>
                  <p class="text-xs text-gray-500 mt-1">AI 正在为您优化文本，请稍候...</p>
                </div>
              </div>
            </div>
          </div>
          <div class="px-4 py-3 border-t bg-muted/30 flex justify-between items-center">
            <button
              v-if="rewrittenText || inputText"
              @click="handleReset"
              class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              重新开始
            </button>
            <span v-if="charDiff !== 0 && rewrittenText" class="text-xs text-muted-foreground">
              <ArrowRightLeft class="w-3 h-3 inline mr-1" />
              {{ charDiff > 0 ? '+' : '' }}{{ charDiff }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Score -->
      <div v-if="scoreResult" class="mt-8 rounded-xl border bg-card shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-primary"></div>
            <span class="text-sm font-medium">质量评分</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">总分</span>
            <span class="text-xl font-bold text-primary">{{ scoreResult.total }}</span>
            <span class="text-xs text-muted-foreground">/ 70</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{{ scoreResult.level }}</span>
          </div>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div v-for="dim in scoreDimensions" :key="dim.key" class="p-3 rounded-lg bg-muted/30">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-muted-foreground">{{ dim.label }}</span>
                <span :class="['text-sm font-semibold', getScoreColor(scoreResult[dim.key], dim.max)]">
                  {{ scoreResult[dim.key] }}/{{ dim.max }}
                </span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  :class="['h-full rounded-full transition-all', getScoreBarColor(scoreResult[dim.key], dim.max)]"
                  :style="{ width: (scoreResult[dim.key] / dim.max * 100) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
