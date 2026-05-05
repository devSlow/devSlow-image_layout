import { ref, onUnmounted, type Ref, isRef } from 'vue'
import { generateVerify, getQrCodeUrl, redeemVerify } from '@/api/auth'
import { getRemainingUsage, redeemCode as redeemCodeApi } from '@/api/document'
import { getDeviceId } from '@/lib/utils'
import { toast } from './useToast'

export function useRedeem(remainCountRef?: Ref<number | null>) {
  const showRedeem = ref(false)
  const redeemSessionId = ref('')
  const redeemQrUrl = ref('')
  const redeemCode = ref('')
  const redeemInputCode = ref('')
  const isRedeeming = ref(false)
  const isRedeemSuccess = ref(false)
  const redeemTab = ref<'qrcode' | 'code'>('qrcode')
  let redeemPollTimer: number | null = null

  onUnmounted(() => {
    if (redeemPollTimer) clearInterval(redeemPollTimer)
  })

  async function refreshRemain(deviceId: string, fallbackRemain?: number) {
    if (remainCountRef && isRef(remainCountRef)) {
      try {
        const r = await getRemainingUsage(deviceId)
        remainCountRef.value = r.data.remain
      } catch {
        if (fallbackRemain !== undefined) {
          remainCountRef.value = fallbackRemain
        }
      }
    }
  }

  async function openRedeem() {
    showRedeem.value = true
    isRedeemSuccess.value = false
    redeemCode.value = ''
    redeemInputCode.value = ''
    try {
      const res = await generateVerify()
      redeemSessionId.value = res.data.sessionId
      redeemQrUrl.value = getQrCodeUrl(res.data.sessionId)
    } catch {
      toast.error('生成二维码失败')
    }
  }

  async function handleRedeemConfirm() {
    if (redeemCode.value.length !== 6) {
      toast.error('请输入6位验证码')
      return
    }
    isRedeeming.value = true
    try {
      const deviceId = getDeviceId()
      const res = await redeemVerify(redeemSessionId.value, redeemCode.value, deviceId)
      isRedeemSuccess.value = true
      const added = res.data?.added || 3
      await refreshRemain(deviceId, res.data?.remain)
      toast.success(`兑换成功！已获得${added}次使用次数`)
      setTimeout(() => { showRedeem.value = false }, 1500)
    } catch (e: any) {
      toast.error(e.message || '验证码错误')
    } finally {
      isRedeeming.value = false
    }
  }

  async function handleRedeemCode() {
    const code = redeemInputCode.value.trim()
    if (!code) {
      toast.error('请输入充值码')
      return
    }
    isRedeeming.value = true
    try {
      const deviceId = getDeviceId()
      const res = await redeemCodeApi(deviceId, code)
      if (!res.data?.success) {
        toast.error(res.data?.message || '充值码无效')
        return
      }
      isRedeemSuccess.value = true
      const added = res.data?.added || 0
      await refreshRemain(deviceId, res.data?.remain)
      toast.success(`兑换成功！已获得${added}次使用次数`)
      setTimeout(() => { showRedeem.value = false }, 1500)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || '充值码无效')
    } finally {
      isRedeeming.value = false
    }
  }

  function closeRedeem() {
    showRedeem.value = false
    if (redeemPollTimer) clearInterval(redeemPollTimer)
  }

  return {
    showRedeem,
    redeemSessionId,
    redeemQrUrl,
    redeemCode,
    redeemInputCode,
    isRedeeming,
    isRedeemSuccess,
    redeemTab,
    openRedeem,
    handleRedeemConfirm,
    handleRedeemCode,
    closeRedeem
  }
}
