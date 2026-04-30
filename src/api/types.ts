export interface UploadResult {
  paperId: string
  status: string
  paragraphCount: number
}

export interface PaperInfo {
  paperId: string
  status: string
  paragraphCount: number
  rewrittenCount: number
  createdAt: string
  updatedAt: string
}

export interface ParagraphItem {
  id: string
  paragraphIndex: number
  type: string
  contentType: string
  locationType: string
  originalText: string
  currentText: string
  rewrittenText: string | null
  imageUrl: string | null
  tableData: string | null
  styleData: string | null
  canRewrite: boolean
  status: string
}

export interface ParagraphList {
  paperId: string
  paragraphCount: number
  paragraphs: ParagraphItem[]
}

export interface RewriteResult {
  paragraphId: string
  rewrittenText: string
}

export interface ExportResult {
  downloadUrl: string
}
