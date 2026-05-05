<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, FileText, Presentation, Upload, CheckCircle, Loader2, Clock, QrCode, X } from 'lucide-vue-next'
import Button from "@/components/ui/Button.vue"
import InputOTP from "@/components/ui/InputOTP.vue"
import { generatePpt, getRemainingUsage } from '@/api/document'
import { useRedeem } from '@/composables/useRedeem'
import { toast } from '@/composables/useToast'
import { getDeviceId } from '@/lib/utils'

const router = useRouter()

const uploadedFile = ref<{ name: string; paperId: string } | null>(null)
const isUploading = ref(false)
const isGenerating = ref(false)
const progress = ref(0)
const statusText = ref('')
const remainCount = ref<number | null>(null)
const downloadUrl = ref('')
let abortController: AbortController | null = null
let progressInterval: ReturnType<typeof setInterval> | null = null
const canUse = computed(() => {
  console.log('[PptGenerate] canUse 计算, remainCount:', remainCount.value)
  return remainCount.value === null || remainCount.value > 0
})
const { showRedeem, redeemSessionId, redeemQrUrl, redeemCode, redeemInputCode, isRedeeming, isRedeemSuccess, redeemTab, openRedeem, handleRedeemConfirm, handleRedeemCode, closeRedeem } = useRedeem(remainCount)

onMounted(() => {
  fetchRemaining()
  toast.info('⚠️ PPT 生成功能处于 Beta 阶段，排版效果可能不稳定，正在持续优化中...')
})

function fetchRemaining() {
  const did = getDeviceId()
  getRemainingUsage(did).then(res => {
    remainCount.value = res.data.remain
  }).catch(() => {
    remainCount.value = 10
  })
}

onBeforeUnmount(() => {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
})

async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
    toast.error('请上传 .docx 或 .doc 格式的文档')
    return
  }

  statusText.value = '正在上传文档...'
  progress.value = 10
  isUploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('deviceId', getDeviceId())

    const token = localStorage.getItem('pp_token')
    const response = await fetch('https://paper.devslow.ccwu.cc/api/document/upload', {
      method: 'POST',
      body: formData,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || '上传失败')
    }

    const result = await response.json()
    uploadedFile.value = {
      name: file.name,
      paperId: result.data.paperId
    }
    progress.value = 100
    statusText.value = '文档上传成功'
  } catch (err: any) {
    toast.error(err.message || '文档上传失败')
    statusText.value = ''
    progress.value = 0
  } finally {
    isUploading.value = false
  }
}

async function handleGeneratePpt() {
  if (!uploadedFile.value?.paperId) return

  isGenerating.value = true
  if (remainCount.value !== null) remainCount.value--
  progress.value = 10
  statusText.value = '正在提取论文要点...'

  abortController = new AbortController()

  try {
    const did = getDeviceId()
    const paperId = uploadedFile.value.paperId

    progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 5
        if (progress.value > 30 && statusText.value === '正在提取论文要点...') {
          statusText.value = '正在生成 PPT 幻灯片...'
        }
        if (progress.value > 60 && statusText.value === '正在生成 PPT 幻灯片...') {
          statusText.value = '正在转换 PPTX 格式...'
        }
      }
    }, 3000)

    const res = await generatePpt(paperId, did, abortController.signal)
    if (progressInterval) clearInterval(progressInterval)
    progressInterval = null

    progress.value = 100
    statusText.value = 'PPT 生成成功！'
    downloadUrl.value = res.data.downloadUrl
    fetchRemaining()
  } catch (err: any) {
    if (err.name === 'CanceledError' || err.name === 'AbortError') {
      toast.info('已取消生成')
    } else {
      toast.error(err?.response?.data?.message || err.message || 'PPT 生成失败')
    }
    fetchRemaining()
    statusText.value = ''
    progress.value = 0
  } finally {
    isGenerating.value = false
    abortController = null
  }
}

function handleDownload() {
  if (!downloadUrl.value) return
  const link = document.createElement('a')
  link.href = downloadUrl.value
  link.download = `${uploadedFile.value?.name?.replace(/\.[^.]+$/, '') || '论文演示'}.pptx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handleReset() {
  uploadedFile.value = null
  downloadUrl.value = ''
  statusText.value = ''
  progress.value = 0
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/10 overflow-hidden">
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
          <router-link to="/ppt" active-class="bg-background text-foreground shadow-sm" class="px-3 py-1.5 text-xs font-medium rounded-md text-foreground shadow-sm">
            生成PPT
          </router-link>
          <router-link to="/upload" active-class="bg-background text-foreground shadow-sm" class="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">
            上传文档
          </router-link>
        </div>
        <div class="flex items-center gap-1">
          <Clock class="w-3.5 h-3.5 text-muted-foreground" />
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
    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- Empty state -->
      <div class="text-center py-16">
        <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Presentation class="w-8 h-8 text-primary" />
        </div>
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight">AI 论文转 PPT</h1>
        <p class="mt-3 text-muted-foreground max-w-md mx-auto">
          上传论文文档，自动生成专业演示文稿
        </p>
        <div v-if="!canUse" class="mt-6 flex justify-center">
          <Button @click="openRedeem" variant="destructive" size="sm">
            <QrCode class="w-4 h-4 mr-2" />
            获取使用次数（扫码）
          </Button>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- Upload Panel -->
        <div class="rounded-xl border bg-card shadow-sm overflow-hidden" :class="{ 'opacity-50 pointer-events-none': !canUse }">
          <div class="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-blue-500"></div>
              <span class="text-sm font-medium">上传文档</span>
            </div>
            <span v-if="uploadedFile" class="text-xs text-muted-foreground">{{ uploadedFile.name }}</span>
          </div>
          <div class="p-4">
            <label
              v-if="!isUploading"
              class="flex flex-col items-center justify-center h-36 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
              :class="{ 'opacity-50 pointer-events-none': isGenerating }"
            >
              <Upload v-if="!uploadedFile" class="w-8 h-8 text-muted-foreground mb-3" />
              <CheckCircle v-else class="w-8 h-8 text-green-500 mb-3" />
              <span v-if="!uploadedFile" class="text-sm text-muted-foreground">点击或拖拽上传 .docx 文档</span>
              <span v-else class="text-sm text-green-600 font-medium">{{ uploadedFile.name }}</span>
              <input
                type="file"
                accept=".docx,.doc"
                @change="handleFileUpload"
                :disabled="isGenerating"
                class="hidden"
              />
            </label>
            <div v-else class="flex flex-col items-center justify-center h-36">
              <Loader2 class="w-8 h-8 text-primary mb-3 animate-spin" />
              <span class="text-sm text-muted-foreground">正在上传文档...</span>
            </div>
          </div>
          <div class="px-4 py-3 border-t bg-muted/30 flex justify-end">
            <Button @click="handleGeneratePpt" :disabled="isGenerating || !uploadedFile || !canUse" class="text-sm">
              <Presentation class="w-4 h-4 mr-1.5" />
              {{ isGenerating ? '生成中...' : '开始生成 PPT' }}
            </Button>
          </div>
        </div>

        <!-- Output Panel -->
        <div class="rounded-xl border bg-card shadow-sm overflow-hidden" :class="{ 'opacity-50 pointer-events-none': !canUse }">
          <div class="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
              <span class="text-sm font-medium">生成结果</span>
            </div>
            <span v-if="statusText" class="text-xs text-muted-foreground">{{ statusText }}</span>
          </div>
          <div class="p-4">
            <div class="h-36 flex items-center justify-center">
              <div v-if="isGenerating" class="flex flex-col items-center gap-2">
                <div class="relative">
                  <div class="w-10 h-10 rounded-full border-3 border-gray-200 dark:border-gray-700"></div>
                  <div class="absolute inset-0 w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin"></div>
                </div>
                <div class="text-center">
                  <p class="text-sm font-semibold">{{ statusText }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">预计需要 3-5 分钟，请耐心等待...</p>
                </div>
                <div class="w-40 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    class="h-full bg-primary transition-all duration-500"
                    :style="{ width: progress + '%' }"
                  ></div>
                </div>
              </div>

              <div v-else-if="downloadUrl" class="flex flex-col items-center gap-2">
                <div class="w-10 h-10 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle class="w-5 h-5 text-green-500" />
                </div>
                <div class="text-center">
                  <p class="text-sm font-semibold">PPT 生成成功！</p>
                  <p class="text-xs text-gray-500 mt-0.5">点击下方按钮下载</p>
                </div>
              </div>

              <div v-else class="text-center text-muted-foreground">
                <FileText class="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p class="text-sm">生成结果将显示在这里</p>
              </div>
            </div>
          </div>
          <div class="px-4 py-3 border-t bg-muted/30 flex justify-end">
            <Button v-if="downloadUrl" @click="handleDownload" class="text-sm">
              <FileText class="w-4 h-4 mr-1.5" />
              下载 PPT 文件
            </Button>
            <button
              v-else-if="uploadedFile || isUploading"
              @click="handleReset"
              class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              重新开始
            </button>
          </div>
        </div>
      </div>

      <!-- Tips -->
      <div class="mt-4 rounded-xl border bg-card shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b bg-muted/30">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-primary"></div>
            <span class="text-sm font-medium">使用提示</span>
          </div>
        </div>
        <div class="p-4 grid md:grid-cols-3 gap-4 text-sm">
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <p class="font-medium mb-1">上传论文文档</p>
              <p class="text-xs text-muted-foreground">支持 .docx / .doc 格式，AI 将自动解析论文结构</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <p class="font-medium mb-1">AI 自动生成</p>
              <p class="text-xs text-muted-foreground">自动提取要点，生成 20-25 页学术风格 PPT</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-primary">3</span>
            </div>
            <div>
              <p class="font-medium mb-1">下载可编辑 PPT</p>
              <p class="text-xs text-muted-foreground">输出原生可编辑 PowerPoint 文件，非图片嵌入</p>
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
            <CheckCircle class="w-10 h-10 text-green-600" />
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
                <Loader2 v-if="isRedeeming" class="w-4 h-4 mr-2 animate-spin" />
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
                <Loader2 v-if="isRedeeming" class="w-4 h-4 mr-2 animate-spin" />
                {{ isRedeeming ? '兑换中...' : '确认兑换' }}
              </Button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
