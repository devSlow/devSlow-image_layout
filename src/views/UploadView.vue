<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { uploadDocument, getRemainingUsage, redeemCode } from '@/api/document'
import { Upload, FileText, Loader2, User, Clock, Ticket, ArrowLeft } from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'

const router = useRouter()
const isDragging = ref(false)
const isUploading = ref(false)
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const remainCount = ref<number | null>(null)
const deviceId = ref('')
const redeemInput = ref('')
const isRedeeming = ref(false)
const redeemMessage = ref('')

const canUpload = computed(() => remainCount.value !== null && remainCount.value > 0)

onMounted(async () => {
  const nav = navigator
  const parts = [
    nav.userAgent,
    nav.platform,
    (nav as any).hardwareConcurrency || 0,
    (nav as any).deviceMemory || 0
  ]
  const str = parts.join('|||')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  deviceId.value = 'fp_' + Math.abs(hash)

  fetchRemaining()
})

async function fetchRemaining() {
  const fetchWithTimeout = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    try {
      const res = await getRemainingUsage(deviceId.value)
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
    errorMessage.value = '仅支持 .docx 格式文件'
    return
  }
  if (!canUpload.value) {
    errorMessage.value = '今日免费次数已用完，请先兑换'
    return
  }
  errorMessage.value = ''
  isUploading.value = true
  try {
    const res = await uploadDocument(file, deviceId.value)
    router.push({ name: 'editor', params: { paperId: res.data.paperId } })
  } catch (e: any) {
    errorMessage.value = e.message || '上传失败'
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

async function handleRedeem() {
  if (!redeemInput.value.trim()) {
    redeemMessage.value = '请输入兑换码'
    return
  }
  isRedeeming.value = true
  redeemMessage.value = ''
  try {
    const res = await redeemCode(deviceId.value, redeemInput.value.trim())
    if (res.data.success) {
      remainCount.value = res.data.remain ?? remainCount.value
      redeemMessage.value = '兑换成功！'
      redeemInput.value = ''
    } else {
      redeemMessage.value = res.data.message || '兑换失败'
    }
  } catch (e: any) {
    redeemMessage.value = e.message || '兑换失败'
  } finally {
    isRedeeming.value = false
  }
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
          <router-link to="/quick" class="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground transition-colors">
            快速降重
          </router-link>
          <router-link to="/upload" class="px-3 py-1.5 text-xs font-medium rounded-md bg-background text-foreground shadow-sm">
            上传文档
          </router-link>
        </div>
        <div class="flex items-center gap-2">
          <Clock class="w-4 h-4 text-muted-foreground" />
          <span class="text-xs text-muted-foreground">剩余</span>
          <span class="text-sm font-bold" :class="canUpload ? 'text-primary' : 'text-destructive'">{{ remainCount ?? '-' }}</span>
          <span class="text-xs text-muted-foreground">次</span>
        </div>
      </div>
    </header>

    <div class="flex items-center justify-center py-12 px-4">
      <div class="w-full max-w-xl">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold tracking-tight">PaperPolish</h1>
          <p class="text-muted-foreground mt-2">可视化段落级论文降重润色工具</p>
        </div>

        <!-- 次数用完时显示兑换卡片 -->
        <Card v-if="!canUpload" class="p-6 mb-6 border-destructive/50 bg-destructive/5">
          <div class="flex items-center gap-3 mb-4">
            <Ticket class="w-6 h-6 text-destructive" />
            <h3 class="text-lg font-semibold text-destructive">今日免费次数已用完</h3>
          </div>
          <p class="text-sm text-muted-foreground mb-4">请在小程序获取兑换码，激活后继续使用</p>
          <div class="flex gap-2">
            <input
              v-model="redeemInput"
              type="text"
              placeholder="请输入兑换码"
              class="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-destructive"
              @keyup.enter="handleRedeem"
            />
            <button
              @click="handleRedeem"
              :disabled="isRedeeming"
              class="px-4 py-2 text-sm font-medium text-white bg-destructive rounded-md hover:bg-destructive/90 disabled:opacity-50"
            >
              {{ isRedeeming ? '兑换中...' : '确定兑换' }}
            </button>
          </div>
          <p v-if="redeemMessage" class="mt-2 text-sm" :class="redeemMessage.includes('成功') ? 'text-green-600' : 'text-destructive'">
            {{ redeemMessage }}
          </p>
        </Card>

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

          <div v-if="errorMessage" class="mt-4 text-center text-sm text-destructive">
            {{ errorMessage }}
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
  </div>
</template>