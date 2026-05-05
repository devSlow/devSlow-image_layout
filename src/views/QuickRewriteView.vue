<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Wand2, Copy, RefreshCw, Sparkles, FileText, ArrowRightLeft, Check, Clock, QrCode, X, CheckCircle2 } from 'lucide-vue-next'
import Button from "@/components/ui/Button.vue"
import InputOTP from "@/components/ui/InputOTP.vue"
import { rewriteText, scoreParagraph, getRemainingUsage } from '@/api/document'
import type { ScoreResult } from '@/api/types'
import { toast } from '@/composables/useToast'
import { getDeviceId } from '@/lib/utils'
import { useRedeem } from '@/composables/useRedeem'

const router = useRouter()
const inputText = ref('')
const rewrittenText = ref('')
const isRewriting = ref(false)
const inputTextareaRef = ref<HTMLTextAreaElement | null>(null)
const roundInfo = ref('')
const scoreResult = ref<ScoreResult | null>(null)
const copied = ref(false)
const remainCount = ref<number | null>(null)
const { showRedeem, redeemSessionId, redeemQrUrl, redeemCode, redeemInputCode, isRedeeming, isRedeemSuccess, redeemTab, openRedeem, handleRedeemConfirm, handleRedeemCode, closeRedeem } = useRedeem(remainCount)

function fetchRemaining() {
  const did = getDeviceId()
  getRemainingUsage(did).then(res => {
    remainCount.value = res.data.remain
  }).catch(() => {
    remainCount.value = 10
  })
}

onMounted(() => {
  fetchRemaining()
})

const charCount = computed(() => inputText.value.length)
const outputCharCount = computed(() => rewrittenText.value.length)
const charDiff = computed(() => {
  if (!inputText.value || !rewrittenText.value) return 0
  return Math.round(((outputCharCount.value - charCount.value) / charCount.value) * 100)
})
const canUse = computed(() => {
  return remainCount.value === null || remainCount.value > 0
})

async function handleRewrite() {
  if (!inputText.value.trim()) {
    toast.error('请输入需要降重的文本')
    return
  }
  if (inputText.value.trim().length < 10) {
    toast.error('文本至少需要10个字符')
    return
  }
  rewrittenText.value = ''
  scoreResult.value = null
  isRewriting.value = true
  if (remainCount.value !== null) remainCount.value--
  try {
    const deviceId = getDeviceId()
    roundInfo.value = '正在进行第一轮润色...'
    const res1 = await rewriteText(inputText.value.trim(), deviceId, 1)
    const round1Text = res1.data.rewrittenText
    if (!round1Text) {
      toast.error('第一轮润色失败，请重试')
      isRewriting.value = false
      fetchRemaining()
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
    fetchRemaining()
  } catch (err: any) {
    toast.error(err?.response?.data?.message || '润色失败，请重试')
    fetchRemaining()
  } finally {
    isRewriting.value = false
  }
}

function handleInputClick() {
  if (!inputText.value.trim()) {
    inputTextareaRef.value?.focus()
    toast.info('请先输入或粘贴需要降重的文本')
    return
  }
  handleRewrite()
}

function handleCopy() {
  navigator.clipboard.writeText(rewrittenText.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function handleReset() {
  rewrittenText.value = ''
  scoreResult.value = null
  roundInfo.value = ''
  handleRewrite()
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

const scoreDimensions = [
  { key: 'directness', label: '流畅度', max: 10 },
  { key: 'rhythm', label: '节奏感', max: 10 },
  { key: 'trustworthiness', label: '可信度', max: 10 },
  { key: 'authenticity', label: '原创性', max: 10 },
  { key: 'conciseness', label: '简洁性', max: 10 },
  { key: 'semanticFidelity', label: '语义保真', max: 10 },
  { key: 'purity', label: '纯净度', max: 10 },
]
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
          <router-link to="/quick" active-class="bg-background text-foreground shadow-sm" class="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">
            快速降重
          </router-link>
          <router-link to="/ppt" active-class="bg-background text-foreground shadow-sm" class="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">
            生成PPT
          </router-link>
          <router-link to="/upload" active-class="bg-background text-foreground shadow-sm" class="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">
            上传文档
          </router-link>
        </div>
        <div class="flex items-center gap-2">
          <Clock class="w-4 h-4 text-muted-foreground" />
          <span class="text-xs text-muted-foreground">剩余</span>
          <span class="text-sm font-bold min-w-[1rem] text-center" :class="remainCount !== null && remainCount > 0 ? 'text-primary' : 'text-destructive'">{{ remainCount ?? '-' }}</span>
          <span class="text-xs text-muted-foreground">次</span>
          <Button @click="openRedeem" variant="destructive" size="xs" class="ml-1 px-2 py-0.5 text-xs">
            获取
          </Button>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-6xl mx-auto px-4 py-8">
      <!-- Empty state -->
      <div class="text-center py-10">
        <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <FileText class="w-8 h-8 text-primary" />
        </div>
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight">粘贴文本，立即降重</h1>
        <p class="mt-3 text-muted-foreground max-w-md mx-auto">
          复制需要降重的段落粘贴到下方文本框，AI 将自动进行两轮润色优化
        </p>
        <div v-if="!canUse" class="mt-6 flex justify-center">
          <Button @click="openRedeem" variant="destructive" size="sm">
            <QrCode class="w-4 h-4 mr-2" />
            获取使用次数（扫码）
          </Button>
        </div>
      </div>

      <!-- Input & Output Panels -->
      <div class="grid md:grid-cols-2 gap-6 min-h-[400px]" :class="{ 'opacity-50 pointer-events-none': !canUse }">
        <!-- Input Panel -->
        <div class="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
          <div class="px-4 py-3 border-b flex items-center justify-between bg-muted/30 shrink-0">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-blue-500"></div>
              <span class="text-sm font-medium">原始文本</span>
            </div>
            <span class="text-xs text-muted-foreground">{{ charCount }} 字</span>
          </div>
          <div class="flex-1 min-h-0 p-4">
            <textarea
              ref="inputTextareaRef"
              v-model="inputText"
              :disabled="isRewriting || !canUse"
              placeholder="请粘贴需要降重的段落文本..."
              class="w-full h-full p-4 text-sm resize-none focus:outline-none bg-transparent border rounded-lg"
            />
          </div>
          <div class="px-4 py-3 border-t bg-muted/30 flex items-center justify-end min-h-[52px] shrink-0">
            <Button @click="handleInputClick" :disabled="isRewriting || !canUse" class="text-sm">
              <Wand2 class="w-4 h-4 mr-1.5" />
              {{ !inputText.trim() ? '请输入文字' : isRewriting ? '润色中...' : '开始润色' }}
            </Button>
          </div>
        </div>

        <!-- Output Panel -->
        <div class="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col relative">
          <div class="px-4 py-3 border-b flex items-center justify-between bg-muted/30 shrink-0">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
              <span class="text-sm font-medium">润色结果</span>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="roundInfo && !isRewriting" class="text-xs text-muted-foreground">{{ roundInfo }}</span>
              <span v-if="rewrittenText" class="text-xs text-muted-foreground">{{ outputCharCount }} 字</span>
              <span v-if="charDiff !== 0 && rewrittenText" class="text-xs text-muted-foreground">
                <ArrowRightLeft class="w-3 h-3 inline mr-1" />
                {{ charDiff > 0 ? '+' : '' }}{{ charDiff }}%
              </span>
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
          <div class="flex-1 min-h-0 p-4 relative">
            <textarea
              :value="rewrittenText || ''"
              readonly
              :placeholder="isRewriting ? '' : '润色结果将显示在这里'"
              class="w-full h-full p-4 text-sm resize-none focus:outline-none bg-transparent border rounded-lg"
            />
            <!-- Loading overlay -->
            <div v-if="isRewriting" class="absolute inset-0 flex items-center justify-center bg-white/95 dark:bg-slate-900/95 z-10 rounded-lg m-4">
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
          <div class="px-4 py-3 border-t bg-muted/30 flex items-center justify-end min-h-[52px] shrink-0">
            <Button v-if="rewrittenText" @click="handleReset" variant="outline" class="text-sm">
              <RefreshCw class="w-4 h-4 mr-1.5" />
              重新润色
            </Button>
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

    <!-- 扫码兑换模态框 -->
    <div v-if="showRedeem" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeRedeem">
      <div class="w-full max-w-md bg-background rounded-xl shadow-lg p-6 mx-4">
        <!-- 成功状态 -->
        <div v-if="isRedeemSuccess" class="text-center py-8">
          <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 class="w-10 h-10 text-green-600" />
          </div>
          <h2 class="text-xl font-semibold text-green-600">兑换成功！</h2>
          <p class="text-muted-foreground mt-2">已获得使用次数</p>
        </div>

        <!-- 兑换表单 -->
        <div v-else>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">获取使用次数</h3>
            <button @click="closeRedeem" class="text-muted-foreground hover:text-foreground">
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Tab 切换 -->
          <div class="flex gap-1 bg-muted/50 rounded-lg p-0.5 mb-5">
            <button @click="redeemTab = 'qrcode'" :class="['flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', redeemTab === 'qrcode' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']">扫码兑换</button>
            <button @click="redeemTab = 'code'" :class="['flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', redeemTab === 'code' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']">充值码</button>
          </div>

          <!-- 扫码兑换 -->
          <template v-if="redeemTab === 'qrcode'">
            <div class="flex flex-col items-center mb-6">
              <div class="w-48 h-48 rounded-lg border bg-muted/30 flex items-center justify-center mb-3">
                <img v-if="redeemQrUrl" :src="redeemQrUrl" alt="QR Code" class="w-44 h-44" />
              </div>
              <p class="text-xs text-muted-foreground mb-1">请使用微信扫描二维码</p>
              <p class="text-xs text-muted-foreground font-mono">sessionId: {{ redeemSessionId }}</p>
            </div>
            <div class="relative mb-5">
              <div class="absolute inset-0 flex items-center"><div class="w-full border-t"></div></div>
              <div class="relative flex justify-center text-xs"><span class="bg-background px-2 text-muted-foreground">输入验证码</span></div>
            </div>
            <div class="flex flex-col items-center gap-4">
              <InputOTP v-model="redeemCode" />
              <Button @click="handleRedeemConfirm" :disabled="redeemCode.length !== 6 || isRedeeming" class="w-full">
                <RefreshCw v-if="isRedeeming" class="w-4 h-4 mr-2 animate-spin" />
                {{ isRedeeming ? '验证中...' : '确认兑换' }}
              </Button>
            </div>
          </template>

          <!-- 充值码兑换 -->
          <template v-else>
            <div class="flex flex-col gap-4">
              <div>
                <label class="text-sm text-muted-foreground mb-2 block">请输入充值码</label>
                <input v-model="redeemInputCode" type="text" placeholder="输入充值码" class="w-full px-3 py-2 rounded-lg border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <Button @click="handleRedeemCode" :disabled="!redeemInputCode.trim() || isRedeeming" class="w-full">
                <RefreshCw v-if="isRedeeming" class="w-4 h-4 mr-2 animate-spin" />
                {{ isRedeeming ? '兑换中...' : '确认兑换' }}
              </Button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
