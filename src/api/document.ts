import request from './request'
import type { UploadResult, PaperInfo, ParagraphList, RewriteResult, ExportResult, ScoreResult, QuickRewriteResult } from './types'

export function uploadDocument(file: File, deviceId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('deviceId', deviceId)
  return request.post<any, { data: UploadResult }>('/document/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function getRemainingUsage(deviceId: string) {
  return request.get<any, { data: { remain: number } }>(`/remain?deviceId=${encodeURIComponent(deviceId)}`)
}

export function redeemCode(deviceId: string, code: string) {
  return request.post<any, { data: { success: boolean; message: string; remain?: number } }>('/redeem', { deviceId, code })
}

export function getPaperInfo(paperId: string) {
  return request.get<any, { data: PaperInfo }>(`/document/${paperId}`)
}

export function getParagraphs(paperId: string) {
  return request.get<any, { data: ParagraphList }>(`/document/${paperId}/paragraphs`)
}

export function rewriteParagraph(paperId: string, paragraphId: string, deviceId: string, selectedText?: string, round: number = 1) {
  return request.post<any, { data: RewriteResult }>(`/document/${paperId}/paragraph/${paragraphId}/rewrite`, {
    deviceId,
    selectedText: selectedText || undefined,
    round
  })
}

export function acceptParagraph(paperId: string, paragraphId: string, text?: string) {
  return request.post<any, { data: { score: ScoreResult | null } }>(`/document/${paperId}/paragraph/${paragraphId}/accept`, text ? { text } : {})
}

export function scoreParagraph(paperId: string, paragraphId: string, originalText: string, rewrittenText: string) {
  return request.post<any, { data: ScoreResult | null }>(`/document/${paperId}/paragraph/${paragraphId}/score`, { originalText, rewrittenText })
}

export function rejectParagraph(paperId: string, paragraphId: string) {
  return request.post<any, any>(`/document/${paperId}/paragraph/${paragraphId}/reject`)
}

export function exportDocument(paperId: string) {
  return request.post<any, { data: ExportResult }>(`/document/${paperId}/export`)
}

export function rewriteText(text: string, deviceId: string, round: number = 1) {
  return request.post<any, { data: QuickRewriteResult }>(`/document/rewrite/text`, {
    text,
    deviceId,
    round
  })
}