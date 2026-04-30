import request from './request'
import type { UploadResult, PaperInfo, ParagraphList, RewriteResult, ExportResult } from './types'

export function uploadDocument(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<any, { data: UploadResult }>('/document/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function getPaperInfo(paperId: string) {
  return request.get<any, { data: PaperInfo }>(`/document/${paperId}`)
}

export function getParagraphs(paperId: string) {
  return request.get<any, { data: ParagraphList }>(`/document/${paperId}/paragraphs`)
}

export function rewriteParagraph(paperId: string, paragraphId: string) {
  return request.post<any, { data: RewriteResult }>(`/document/${paperId}/paragraph/${paragraphId}/rewrite`)
}

export function acceptParagraph(paperId: string, paragraphId: string, text?: string) {
  return request.post<any, any>(`/document/${paperId}/paragraph/${paragraphId}/accept`, text ? { text } : {})
}

export function rejectParagraph(paperId: string, paragraphId: string) {
  return request.post<any, any>(`/document/${paperId}/paragraph/${paragraphId}/reject`)
}

export function exportDocument(paperId: string) {
  return request.post<any, { data: ExportResult }>(`/document/${paperId}/export`)
}
