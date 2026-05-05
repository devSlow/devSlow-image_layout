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
}

export function generateVerify() {
  return request.post<VerifyGenerateRes>('/auth/verify/generate')
}

export function getQrCodeUrl(sessionId: string) {
  return `/api/auth/verify/qrcode?sessionId=${sessionId}`
}

export function getVerifyCode(sessionId: string) {
  return request.get<any>('/auth/verify/code', { params: { sessionId } })
}

export function confirmVerify(sessionId: string, code: string) {
  return request.post<VerifyConfirmRes>('/auth/verify/confirm', { sessionId, code })
}

export function redeemVerify(sessionId: string, code: string, deviceId: string) {
  return request.post<VerifyRedeemRes>('/auth/verify/redeem', { sessionId, code, deviceId })
}
