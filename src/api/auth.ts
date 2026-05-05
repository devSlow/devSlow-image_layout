import request from './request'

export interface VerifyGenerateRes {
  sessionId: string
}

export interface VerifyConfirmRes {
  token: string
}

export interface VerifyRedeemRes {
  success: boolean
  added: number
  remain: number
}

export function generateVerify() {
  return request.post<VerifyGenerateRes>('/api/auth/verify/generate')
}

export function getQrCodeUrl(sessionId: string) {
  return `https://paper.devslow.ccwu.cc/api/auth/verify/qrcode?sessionId=${sessionId}`
}

export function getVerifyCode(sessionId: string) {
  return request.get<any>('/api/auth/verify/code', { params: { sessionId } })
}

export function confirmVerify(sessionId: string, code: string) {
  return request.post<VerifyConfirmRes>('/api/auth/verify/confirm', { sessionId, code })
}

export function redeemVerify(sessionId: string, code: string, deviceId: string) {
  return request.post<VerifyRedeemRes>('/api/auth/verify/redeem', { sessionId, code, deviceId })
}
