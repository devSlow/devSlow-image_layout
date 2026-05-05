<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { uploadDocument, getRemainingUsage } from '@/api/document'
import { Upload, FileText, Loader2, Clock, QrCode, RefreshCw, CheckCircle2, ArrowLeft } from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import InputOTP from '@/components/ui/InputOTP.vue'
import Button from '@/components/ui/Button.vue'
import { useRedeem } from '@/composables/useRedeem'
import { toast } from '@/composables/useToast'
import { getDeviceId } from '@/lib/utils'

const router = useRouter()
const isDragging = ref(false)
const isUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const remainCount = ref<number | null>(null)

const canUpload = computed(() => {
  console.log('[Upload] canUpload 计算, remainCount:', remainCount.value)
  return remainCount.value === null || remainCount.value > 0
})

const { showRedeem, redeemSessionId, redeemQrUrl, redeemCode, redeemInputCode, isRedeeming, isRedeemSuccess, redeemTab, openRedeem, handleRedeemConfirm, handleRedeemCode, closeRedeem } = useRedeem(remainCount)

onMounted(async () => {
  fetchRemaining()
  toast.info('⚠️ 上传文档功能目前处于内测阶段，部分格式可能存在兼容问题，正在持续优化中...')
})

onUnmounted(() => {
  // useRedeem 内部已处理清理
})

async function fetchRemaining() {
  const did = getDeviceId()
  const fetchWithTimeout = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    try {
      const res = await getRemainingUsage(did)
      clearTimeout(timeout)
      remainCount.value = res.data.remain
    } catch (e) {
      clearTimeout(timeout)
      remainCount.value = 10
    }
  }
  fetchWithTimeout()
}

async function handleFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    toast.error('仅支持 .docx 格式文件')
    return
  }
  if (!canUpload.value) {
    toast.error('今日免费次数已用完，请先兑换')
    return
  }
  isUploading.value = true
  if (remainCount.value !== null) remainCount.value--
  try {
    const res = await uploadDocument(file, getDeviceId())
    fetchRemaining()
    router.push({ name: 'editor', params: { paperId: res.data.paperId } })
  } catch (e: any) {
    toast.error(e.message || '上传失败')
    fetchRemaining()
  } finally {
    isUploading.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
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
          <router-link to="/quick" active-class="bg-background text-foreground shadow-sm" class="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">
            快速降重
          </router-link>
          <router-link to="/ppt" active-class="bg-background text-foreground shadow-sm" class="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">
            生成PPT
          </router-link>
          <router-link to="/upload" active-class="bg-background text-foreground shadow-sm" class="px-3 py-1.5 text-xs font-medium rounded-md text-foreground shadow-sm">
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

    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Empty state -->
      <div class="text-center py-16">
        <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Upload class="w-8 h-8 text-primary" />
        </div>
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight">上传文档降重</h1>
        <p class="mt-3 text-muted-foreground max-w-md mx-auto">
          上传 Word 文档，可视化逐段 AI 润色
        </p>
      </div>

        <!-- 次数用完时显示获取次数按钮 -->
        <div v-if="!canUpload" class="mb-6 flex justify-center">
          <Button @click="openRedeem" variant="destructive">
            <QrCode class="w-4 h-4 mr-2" />
            获取使用次数（扫码）
          </Button>
        </div>

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

        <Card class="p-8" :class="canUpload ? '' : 'opacity-50'">
          <div
            class="border-2 border-dashed rounded-lg p-12 text-center transition-colors"
            :class="[
              canUpload ? (
                isDragging 
                  ? 'border-primary bg-primary/5 cursor-pointer' 
                  : 'border-muted-foreground/25 hover:border-primary/50 cursor-pointer'
              ) : 'border-muted-foreground/10 cursor-not-allowed'
            ]"
            @dragover.prevent="canUpload && (isDragging = true)"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="canUpload && onDrop($event)"
            @click="canUpload && fileInput?.click()"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".docx"
              class="hidden"
              :disabled="!canUpload"
              @change="onFileChange"
            />
            <div class="flex flex-col items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Upload class="w-8 h-8" :class="canUpload ? 'text-muted-foreground' : 'text-muted-foreground/50'" />
              </div>
              <div>
                <p class="text-lg font-medium">{{ canUpload ? '拖拽文件到此处，或点击上传' : '今日次数已用完' }}</p>
                <p class="text-sm text-muted-foreground mt-1">支持 .docx 格式</p>
              </div>
            </div>
          </div>

          <div v-if="isUploading" class="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 class="w-4 h-4 animate-spin" />
            <span class="text-sm">正在上传并解析文档...</span>
          </div>

        </Card>

        <div class="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div class="flex items-center gap-1.5">
            <FileText class="w-4 h-4" />
            <span>上传 Word 文档</span>
          </div>
          <span>→</span>
          <span>逐段 AI 润色</span>
          <span>→</span>
          <span>导出下载</span>
        </div>
      </div>
    </div>
  </template>