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
  htmlContent: string | null
  canRewrite: boolean
  status: string
}

export interface ParagraphList {
  paperId: string
  paragraphCount: number
  paragraphs: ParagraphItem[]
}

export interface ScoreResult {
  directness: number
  rhythm: number
  trustworthiness: number
  authenticity: number
  conciseness: number
  semanticFidelity: number
  purity: number
  total: number
  level: string
}

export interface RewriteResult {
  paragraphId: string
  rewrittenText: string
  round: number
  score: ScoreResult | null
}

export interface ExportResult {
  downloadUrl: string
}

export interface QuickRewriteResult {
  originalText: string
  rewrittenText: string
  round: number
  score: ScoreResult | null
}
