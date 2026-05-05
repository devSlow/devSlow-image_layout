<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { QrCode, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import InputOTP from '@/components/ui/InputOTP.vue'
import { generateVerify, getQrCodeUrl, confirmVerify } from '@/api/auth'
import { redeemCode } from '@/api/document'
import { getDeviceId } from '@/lib/utils'
import { toast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const sessionId = ref('')
const qrCodeUrl = ref('')
const code = ref('')
const redeemInputCode = ref('')
const isVerifying = ref(false)
const isSuccess = ref(false)
const errorMsg = ref('')
const verifyTab = ref<'qrcode' | 'code'>('qrcode')
let pollTimer: number | null = null

onMounted(async () => {
  await initVerify()
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

async function initVerify() {
  try {
    const urlSessionId = route.query.sessionId as string
    if (urlSessionId) {
      sessionId.value = urlSessionId
    } else {
      const res = await generateVerify()
      sessionId.value = res.data.sessionId
    }
    qrCodeUrl.value = getQrCodeUrl(sessionId.value)
  } catch (e: any) {
    errorMsg.value = '初始化失败，请刷新重试'
  }
}

async function handleConfirm() {
  if (code.value.length !== 6) {
    toast.error('请输入6位验证码')
    return
  }
  isVerifying.value = true
  try {
    const res = await confirmVerify(sessionId.value, code.value)
    const token = res.data.token
    localStorage.setItem('pp_token', token)
    isSuccess.value = true
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/quick'
    setTimeout(() => {
      router.push(redirect)
    }, 1500)
  } catch (e: any) {
    toast.error(e.message || '验证码错误')
  } finally {
    isVerifying.value = false
  }
}

async function handleRedeemCode() {
  const inputCode = redeemInputCode.value.trim()
  if (!inputCode) {
    toast.error('请输入充值码')
    return
  }
  isVerifying.value = true
  try {
    const deviceId = getDeviceId()
    const res = await redeemCode(deviceId, inputCode)
    if (!res.data?.success) {
      toast.error(res.data?.message || '充值码无效')
      return
    }
    isSuccess.value = true
    const added = res.data?.added || 0
    localStorage.setItem('pp_token', res.data?.token || 'redeem_verified')
    toast.success(`兑换成功！已获得${added}次使用次数`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/quick'
    setTimeout(() => {
      router.push(redirect)
    }, 1500)
  } catch (e: any) {
    toast.error(e?.response?.data?.message || e.message || '充值码无效')
  } finally {
    isVerifying.value = false
  }
}

function handleRefresh() {
  sessionId.value = ''
  qrCodeUrl.value = ''
  code.value = ''
  errorMsg.value = ''
  initVerify()
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <QrCode class="w-8 h-8 text-primary" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight">验证身份</h1>
        <p class="text-muted-foreground mt-2">通过扫码验证或输入充值码获取使用次数</p>
      </div>

      <!-- Success State -->
      <div v-if="isSuccess" class="text-center py-8">
        <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 class="w-10 h-10 text-green-600" />
        </div>
        <h2 class="text-xl font-semibold text-green-600">验证成功！</h2>
        <p class="text-muted-foreground mt-2">正在跳转...</p>
      </div>

      <!-- Verify Form -->
      <div v-else class="rounded-xl border bg-card shadow-sm p-6">
        <!-- Tab 切换 -->
        <div class="flex gap-1 bg-muted/50 rounded-lg p-0.5 mb-5">
          <button @click="verifyTab = 'qrcode'" :class="['flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', verifyTab === 'qrcode' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']">扫码验证</button>
          <button @click="verifyTab = 'code'" :class="['flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', verifyTab === 'code' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']">充值码</button>
        </div>

        <!-- 扫码验证 -->
        <template v-if="verifyTab === 'qrcode'">
          <div class="flex flex-col items-center mb-6">
            <div class="w-48 h-48 rounded-lg border bg-muted/30 flex items-center justify-center mb-3">
              <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" class="w-44 h-44" />
            </div>
            <p class="text-xs text-muted-foreground">请使用微信扫描二维码</p>
            <p v-if="sessionId" class="text-xs text-muted-foreground font-mono mt-1">sessionId: {{ sessionId }}</p>
          </div>

          <div class="relative mb-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t"></div>
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="bg-card px-2 text-muted-foreground">输入验证码</span>
            </div>
          </div>

          <div class="flex flex-col items-center gap-4">
            <InputOTP v-model="code" />
            <Button @click="handleConfirm" :disabled="code.length !== 6 || isVerifying" class="w-full">
              <RefreshCw v-if="isVerifying" class="w-4 h-4 mr-2 animate-spin" />
              {{ isVerifying ? '验证中...' : '确认验证' }}
            </Button>
            <button @click="handleRefresh" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
              重新生成二维码
            </button>
          </div>
        </template>

        <!-- 充值码验证 -->
        <template v-else>
          <div class="flex flex-col gap-4">
            <div>
              <label class="text-sm text-muted-foreground mb-2 block">请输入充值码</label>
              <input v-model="redeemInputCode" type="text" placeholder="输入充值码" class="w-full px-3 py-2 rounded-lg border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <Button @click="handleRedeemCode" :disabled="!redeemInputCode.trim() || isVerifying" class="w-full">
              <RefreshCw v-if="isVerifying" class="w-4 h-4 mr-2 animate-spin" />
              {{ isVerifying ? '兑换中...' : '确认兑换' }}
            </Button>
          </div>
        </template>

        <!-- Error -->
        <div v-if="errorMsg" class="mt-4 flex items-center gap-2 text-destructive text-sm">
          <AlertCircle class="w-4 h-4" />
          {{ errorMsg }}
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-muted-foreground mt-6">
        验证通过后即可使用论文降重功能
      </p>
    </div>
  </div>
</template>
