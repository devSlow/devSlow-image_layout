<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPaperInfo, getParagraphs, rewriteParagraph, acceptParagraph, rejectParagraph, exportDocument, getRemainingUsage } from '@/api/document'
import type { ParagraphItem, PaperInfo } from '@/api/types'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import { ArrowLeft, Wand2, Check, X, Download, Loader2, RefreshCw, XCircle, List, FileText, Code, FileDown, Eye, Clock } from 'lucide-vue-next'
import hljs from 'highlight.js'
import PdfPreview from '@/components/PdfPreview.vue'

const route = useRoute()
const paperId = route.params.paperId as string

const paperInfo = ref<PaperInfo | null>(null)
const paragraphs = ref<ParagraphItem[]>([])
const selectedId = ref<string | null>(null)
const loading = ref(false)
const exporting = ref(false)
const editingText = ref('')
const isEditing = ref(false)
const previewRef = ref<HTMLElement | null>(null)
const viewMode = ref<'text' | 'pdf'>('text')
const pdfLoadFailed = ref(false)
const remainCount = ref<number | null>(null)
const deviceId = ref('')

const canRewrite = computed(() => remainCount.value !== null && remainCount.value > 0)

onMounted(async () => {
  // 获取设备指纹
  const nav = navigator
  const parts = [
    nav.userAgent,
    nav.platform,
    nav.hardwareConcurrency || 0,
    nav.deviceMemory || 0
  ]
  const str = parts.join('|||')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  deviceId.value = 'fp_' + Math.abs(hash)

  // 获取剩余次数
  try {
    const res = await getRemainingUsage(deviceId.value)
    remainCount.value = res.data.remain
  } catch (e) {
    remainCount.value = 10
  }

  await loadData()
})

const selected = computed(() => paragraphs.value.find(p => p.id === selectedId.value))

const headings = computed(() =>
  paragraphs.value.filter(p => p.type === 'heading' && p.originalText?.trim())
)

const rewriteStats = computed(() => {
  const canRewrite = paragraphs.value.filter(p => p.canRewrite).length
  const rewritten = paragraphs.value.filter(p => p.status === 'replaced').length
  return { canRewrite, rewritten }
})

watch(pdfLoadFailed, (failed) => {
  if (failed) {
    viewMode.value = 'text'
  }
})

async function loadData() {
  loading.value = true
  try {
    const [infoRes, paraRes] = await Promise.all([
      getPaperInfo(paperId),
      getParagraphs(paperId)
    ])
    paperInfo.value = infoRes.data
    paragraphs.value = paraRes.data.paragraphs
  } catch (e: any) {
    alert(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleRewrite() {
  if (!selected.value) return
  if (!canRewrite.value) {
    alert('今日免费次数已用完，请先兑换')
    return
  }
  const idx = paragraphs.value.findIndex(p => p.id === selected.value!.id)
  if (idx === -1) return
  paragraphs.value[idx].status = 'loading'
  try {
    const res = await rewriteParagraph(paperId, selected.value.id, deviceId.value)
    paragraphs.value[idx].rewrittenText = res.data.rewrittenText
    paragraphs.value[idx].status = 'rewritten'
    // 刷新剩余次数
    const remainRes = await getRemainingUsage(deviceId.value)
    remainCount.value = remainRes.data.remain
  } catch (e: any) {
    alert(e.message || '润色失败')
    paragraphs.value[idx].status = 'original'
  }
}

async function handleAccept() {
  if (!selected.value) return
  try {
    const text = isEditing.value ? editingText.value : undefined
    await acceptParagraph(paperId, selected.value.id, text)
    const idx = paragraphs.value.findIndex(p => p.id === selected.value!.id)
    if (idx !== -1) {
      paragraphs.value[idx].currentText = text || paragraphs.value[idx].rewrittenText || paragraphs.value[idx].currentText
      paragraphs.value[idx].status = 'replaced'
    }
    isEditing.value = false
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

async function handleReject() {
  if (!selected.value) return
  try {
    await rejectParagraph(paperId, selected.value.id)
    const idx = paragraphs.value.findIndex(p => p.id === selected.value!.id)
    if (idx !== -1) {
      paragraphs.value[idx].status = 'original'
      paragraphs.value[idx].rewrittenText = null
    }
    isEditing.value = false
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const res = await exportDocument(paperId)
    window.open(res.data.downloadUrl, '_blank')
  } catch (e: any) {
    alert(e.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

function selectParagraph(id: string) {
  selectedId.value = id
  isEditing.value = false
}

function closePanel() {
  selectedId.value = null
  isEditing.value = false
}

function startEditing() {
  if (!selected.value?.rewrittenText) return
  editingText.value = selected.value.rewrittenText
  isEditing.value = true
}

function scrollToParagraph(id: string) {
  const el = document.getElementById(`para-${id}`)
  if (el && previewRef.value) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  selectParagraph(id)
}

function getParagraphClass(para: ParagraphItem) {
  const isSelected = para.id === selectedId.value
  const classes = ['relative', 'rounded', 'px-2', 'py-0.5', 'transition-all']

  if (para.canRewrite) {
    classes.push('cursor-pointer')
    if (isSelected) {
      classes.push('ring-2', 'ring-primary', 'bg-primary/5')
    } else {
      classes.push('hover:bg-accent/50')
    }
  }

  if (para.status === 'replaced') {
    classes.push('bg-green-50/50')
  }

  return classes.join(' ')
}

function getHeadingClass(type: string) {
  switch (type) {
    case 'heading': return 'text-base font-bold leading-relaxed mb-2'
    default: return 'text-sm leading-[2] mb-1 text-indent'
  }
}

function getHeadingIndent(depth: number) {
  return `pl-${depth * 3}`
}

function getHeadingDepth(para: ParagraphItem): number {
  const text = para.originalText?.trim() || ''
  if (/^[一二三四五六七八九十]、/.test(text)) return 0
  if (/^第[一二三四五六七八九十]+[章节]/.test(text)) return 0
  if (/^\d+(\.\d+)*[　\s]/.test(text)) {
    const match = text.match(/^\d+(\.\d+)*/)?.[0].split('.') || []
    return match.length - 1
  }
  return 1
}

function getImageUrls(para: ParagraphItem): string[] {
  if (!para.imageUrl) return []
  return para.imageUrl.split('|||').filter(u => u.trim())
}

function parseTableData(tableData: string | null): string[][][] {
  if (!tableData) return []
  try {
    return JSON.parse(tableData)
  } catch {
    return []
  }
}

function hasContent(para: ParagraphItem): boolean {
  const ct = getEffectiveContentType(para)
  if (ct === 'image' && para.imageUrl) return true
  if (ct === 'table' && para.tableData) return true
  if (ct === 'code' && (para.originalText?.trim() || para.currentText?.trim())) return true
  if (ct === 'text') {
    const text = (para.currentText || para.originalText || '').trim()
    return text.length > 0
  }
  return false
}

function detectLanguage(code: string): string {
  try {
    const result = hljs.highlightAuto(code)
    return result.language || 'plaintext'
  } catch {
    return 'plaintext'
  }
}

function highlightCode(code: string): string {
  try {
    const result = hljs.highlightAuto(code)
    return result.value
  } catch {
    return code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}

function renderTextWithCitations(text: string): string {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/(\S)(\[[\d,\-~、]+[\d]*\])/g, '$1<sup>$2</sup>')
  html = html.replace(/(\[[\d,\-~、]+[\d]*\])(\S)/g, '<sup>$1</sup>$2')
  return html
}

interface ParaStyle {
  fontSize?: number
  fontFamily?: string
  bold?: boolean
  italic?: boolean
  color?: string
  alignment?: string
  lineSpacing?: number
  spaceBefore?: number
  spaceAfter?: number
  firstLineIndent?: number
  firstLineChars?: number
  leftIndent?: number
  headingLevel?: number
  styleName?: string
}

function parseStyle(styleData: string | null): ParaStyle | null {
  if (!styleData) return null
  try {
    return JSON.parse(styleData)
  } catch {
    return null
  }
}

function buildInlineStyle(para: ParagraphItem): string {
  const style = parseStyle(para.styleData)
  if (!style) return ''
  const parts: string[] = []
  if (style.fontSize) parts.push(`font-size: ${style.fontSize}pt`)
  if (style.fontFamily) parts.push(`font-family: ${style.fontFamily}`)
  if (style.bold) parts.push('font-weight: bold')
  if (style.italic) parts.push('font-style: italic')
  if (style.color) parts.push(`color: #${style.color}`)
  if (style.alignment) {
    const map: Record<string, string> = { center: 'center', right: 'right', both: 'justify', left: 'left' }
    if (map[style.alignment]) parts.push(`text-align: ${map[style.alignment]}`)
  }
  if (style.lineSpacing) {
    const lh = Math.round(style.lineSpacing / 240 * 100) / 100
    parts.push(`line-height: ${lh}`)
  }
  if (style.spaceBefore) parts.push(`margin-top: ${Math.round(style.spaceBefore / 20)}pt`)
  if (style.spaceAfter) parts.push(`margin-bottom: ${Math.round(style.spaceAfter / 20)}pt`)
  if (style.firstLineIndent) parts.push(`text-indent: ${Math.round(style.firstLineIndent / 20)}pt`)
  else if (style.firstLineChars) parts.push(`text-indent: ${style.firstLineChars / 100}em`)
  if (style.leftIndent) parts.push(`padding-left: ${Math.round(style.leftIndent / 20)}pt`)
  return parts.length ? parts.join('; ') : ''
}

function buildHeadingStyle(style: ParaStyle | null): string {
  if (!style || !style.headingLevel) return ''
  const sizes: Record<number, number> = { 1: 22, 2: 16, 3: 14 }
  const size = sizes[style.headingLevel] || 14
  return `font-size: ${size}pt; font-weight: bold;`
}

function isCodeLike(text: string, strict: boolean = false): boolean {
  if (!text) return false
  if (!strict && text.trim().length < 5) return false
  let score = 0
  if (/^\s*(public|private|protected|class|interface|extends|implements)\s/.test(text)) score += 3
  if (/@\w+/.test(text)) score += 1
  if (/(String|Integer|Long|Boolean|List<|Map<|Double|Float)\s+\w+/.test(text)) score += 2
  if (/\w+\s*=\s*[^;]+;/.test(text)) score += 1
  if (/\w+\s*=\s*\S/.test(text) && /;/.test(text)) score += 1
  if (/\/\//.test(text) || /\/\*/.test(text) || /\*\//.test(text)) score += 1
  if (/\b(import|package|return|new|void|static|final|throws|throw)\s/.test(text)) score += 2
  if (/\b(function|const|var|let|def|func|async|await)\s/.test(text)) score += 2
  if (/\b(int|double|float|char|byte|short|long|boolean)\s+\w+/.test(text)) score += 2
  if (/\b(if|else|for|while|switch|case|try|catch|finally)\s*[\(]/.test(text)) score += 2
  if (/^\s*[\{\}]\s*$/.test(text)) score += 1
  if (/^\s*\}\s*$/.test(text)) score += 1
  if (/^\s*\{/.test(text) && /\}\s*$/.test(text)) score += 1
  if (/\bSystem\.\w+/.test(text)) score += 1
  if (/^\s*\w+(\.\w+)+\s*\(/.test(text)) score += 1
  if (/^\s*\/\//.test(text)) score += 1
  if (/^\s*\*/.test(text) && /\@$/.test(text) === false) score += 1
  const threshold = strict ? 4 : 2
  return score >= threshold
}

function getEffectiveContentType(para: ParagraphItem): string {
  if (para.contentType === 'code') return 'code'
  if (para.contentType === 'image') return 'image'
  if (para.contentType === 'table') return 'table'
  if (para.contentType === 'text' && isCodeLike(para.currentText || para.originalText || '')) return 'code'
  return para.contentType || 'text'
}

function isCodeContinuation(para: ParagraphItem): boolean {
  if (para.contentType === 'code') return true
  if (para.contentType === 'image' || para.contentType === 'table') return false
  const text = (para.currentText || para.originalText || '').trim()
  if (!text) return true
  if (isCodeLike(text)) return true
  if (/^\s*[\{\}]\s*$/.test(text)) return true
  if (/^\s*[\(\)]\s*$/.test(text)) return true
  if (/^\s*\w+\s*;/.test(text) && text.length < 80) return true
  if (/^\s*\/\//.test(text)) return true
  if (/^\s*\/\*/.test(text)) return true
  if (/^\s*\*/.test(text)) return true
  if (/^\s*@\w+/.test(text)) return true
  if (/\b(private|public|protected)\s+\w+/.test(text)) return true
  if (/^\s*\w+\s+\w+\s*[;={]/.test(text)) return true
  if (/^\s*\w+(\.\w+)*\s*\(/.test(text)) return true
  if (/^\s*(this|super)\.\w+/.test(text)) return true
  if (/^\s*(extends|implements|throws)\s/.test(text)) return true
  if (/^\s*(case|default|break|continue)\b/.test(text)) return true
  if (/^\s*\w+\[\]/.test(text)) return true
  if (/=\s*new\s/.test(text)) return true
  if (/^\s*return\s/.test(text)) return true
  if (/^\s*\w+<.*>/.test(text)) return true
  return false
}

function isClearlyNotCode(para: ParagraphItem): boolean {
  if (para.type === 'heading') return true
  const text = (para.currentText || para.originalText || '').trim()
  if (!text) return false
  if (text.length > 200 && !text.includes('{') && !text.includes(';') && !text.includes('//')) return true
  if (/^[一二三四五六七八九十]+[、．.]/.test(text)) return true
  if (/^第[一二三四五六七八九十]+[章节]/.test(text)) return true
  if (/^(摘要|Abstract|参考文献|致谢|附录|引言|绪论|结论|目录)/i.test(text)) return true
  if (/^[（\(]?[\d一二三四五六七八九十]+[）\)]\s*[，,、]/.test(text)) return true
  if (/^[（\(]?[\d一二三四五六七八九十]+[）\)]\s*\S/.test(text) && !text.includes('{') && !text.includes(';') && !text.includes('=')) return true
  if (/^图\s*\d/.test(text)) return true
  if (/^表\s*\d/.test(text)) return true
  if (/^注[：:]\s/.test(text)) return true
  return false
}

const abstractIndex = computed(() => {
  for (let i = 0; i < paragraphs.value.length; i++) {
    const text = (paragraphs.value[i].originalText || '').trim()
    if (/^(摘要|Abstract|ABSTRACT)\s*$/.test(text)) return i
  }
  return -1
})

function isBeforeAbstract(para: ParagraphItem): boolean {
  if (abstractIndex.value === -1) return false
  return para.paragraphIndex < paragraphs.value[abstractIndex.value].paragraphIndex
}

function isFirstLevelHeading(para: ParagraphItem): boolean {
  if (para.type !== 'heading') return false
  const text = para.originalText?.trim() || ''
  if (/^第[一二三四五六七八九十百]+[章节篇部分]/.test(text)) return true
  if (/^[一二三四五六七八九十百]+[、．.]/.test(text)) return true
  if (/^摘要|^Abstract|^参考文献|^致谢|^附录|^引言|^绪论|^结论|^目录/i.test(text)) return true
  if (/^[1-9]\d*[　\s　]/.test(text)) return true
  return false
}

interface MergedBlock {
  type: 'single' | 'code-group'
  para?: ParagraphItem
  codeParas?: ParagraphItem[]
  raw?: boolean
}

const allBlocks = computed(() => {
  const merged: MergedBlock[] = []
  let i = 0
  let inCodeBlock = false
  let codeGroup: ParagraphItem[] = []

  while (i < paragraphs.value.length) {
    const para = paragraphs.value[i]

    if (isBeforeAbstract(para)) {
      merged.push({ type: 'single', para, raw: true })
      i++
      continue
    }

    const ct = getEffectiveContentType(para)

    if (!inCodeBlock) {
      if (ct === 'code') {
        inCodeBlock = true
        codeGroup = [para]
        i++
        while (i < paragraphs.value.length) {
          const next = paragraphs.value[i]
          if (isClearlyNotCode(next)) break
          if (getEffectiveContentType(next) === 'code' || isCodeContinuation(next)) {
            codeGroup.push(next)
            i++
          } else {
            break
          }
        }
        merged.push({ type: 'code-group', codeParas: [...codeGroup] })
        inCodeBlock = false
        codeGroup = []
      } else {
        merged.push({ type: 'single', para })
        i++
      }
    }
  }

  return merged
})

onMounted(loadData)
</script>

<template>
  <div class="h-screen flex flex-col bg-muted/30">
    <header class="border-b bg-background px-6 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <router-link to="/" class="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft class="w-5 h-5" />
        </router-link>
        <h1 class="text-lg font-semibold">PaperPolish</h1>
        <span v-if="paperInfo" class="text-sm text-muted-foreground">
          共 {{ paperInfo.paragraphCount }} 段
        </span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
          <Clock class="w-4 h-4 text-muted-foreground" />
          <span class="text-sm text-muted-foreground">今日剩余</span>
          <span class="text-sm font-bold" :class="canRewrite ? 'text-primary' : 'text-destructive'">{{ remainCount ?? '-' }}</span>
          <span class="text-sm text-muted-foreground">次</span>
        </div>
        <div v-if="paperInfo && rewriteStats.rewritten > 0" class="text-sm text-muted-foreground">
          已润色 {{ rewriteStats.rewritten }} 段
        </div>
        <Button @click="handleExport" :disabled="exporting" class="gap-2">
          <Download v-if="!exporting" class="w-4 h-4" />
          <Loader2 v-else class="w-4 h-4 animate-spin" />
          导出文档
        </Button>
      </div>
    </header>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-2 text-muted-foreground">
        <Loader2 class="w-5 h-5 animate-spin" />
        <span>加载中...</span>
      </div>
    </div>

    <div v-else class="flex-1 flex overflow-hidden">
      <!-- 左栏：目录导航 -->
      <aside class="w-[220px] border-r bg-background overflow-y-auto shrink-0">
        <div class="p-4">
          <div class="flex items-center gap-2 mb-4">
            <List class="w-4 h-4 text-muted-foreground" />
            <span class="text-sm font-medium text-muted-foreground">目录</span>
          </div>
          <nav class="space-y-0.5">
            <button
              v-for="h in headings"
              :key="h.id"
              class="w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-accent/50 text-muted-foreground hover:text-foreground block truncate"
              :style="{ paddingLeft: `${8 + getHeadingDepth(h) * 12}px` }"
              @click="scrollToParagraph(h.id)"
              :title="h.originalText"
            >
              {{ h.originalText }}
            </button>
          </nav>
          <div v-if="headings.length === 0" class="text-xs text-muted-foreground/60 text-center py-4">
            暂无标题
          </div>
        </div>
      </aside>

      <!-- 中栏：PDF预览 / 论文预览 -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- 预览模式切换 -->
        <div class="flex items-center gap-1 px-4 py-2 border-b bg-background shrink-0">
          <button
            @click="viewMode = 'pdf'"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors"
            :class="viewMode === 'pdf' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'"
          >
            <FileDown class="w-3.5 h-3.5" />
            PDF 预览
          </button>
          <button
            @click="viewMode = 'text'"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors"
            :class="viewMode === 'text' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'"
          >
            <Eye class="w-3.5 h-3.5" />
            文本预览
          </button>
        </div>

        <!-- PDF 预览 -->
        <div v-if="viewMode === 'pdf'" class="flex-1 overflow-hidden">
          <PdfPreview :paperId="paperId" @load-failed="pdfLoadFailed = true" />
        </div>

        <!-- 文本预览（连续滚动） -->
        <div v-else ref="previewRef" class="flex-1 overflow-y-auto bg-muted/30 py-8 px-6">
        <div class="max-w-[800px] mx-auto bg-white shadow-lg rounded-sm px-[60px] py-[56px]">
          <template v-for="(block, blockIdx) in allBlocks" :key="blockIdx">
                <!-- 合并的代码块 -->
                <template v-if="block.type === 'code-group' && block.codeParas">
                  <div class="my-3 relative group">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-b-0 border-gray-200 rounded-t-md text-xs text-gray-500">
                      <Code class="w-3 h-3" />
                      <span>{{ detectLanguage(block.codeParas.map(p => p.originalText || '').join('\n')) }}</span>
                    </div>
                    <pre class="bg-gray-50 border border-gray-200 !rounded-t-none !rounded-b-md !m-0 !p-4 overflow-x-auto text-sm leading-relaxed"><code class="!bg-transparent !p-0" v-html="highlightCode(block.codeParas.map(p => p.originalText || '').join('\n'))"></code></pre>
                  </div>
                </template>

                <!-- 普通段落 -->
                <template v-else-if="block.type === 'single' && block.para">
                  <div
                    v-if="hasContent(block.para)"
                    :id="`para-${block.para.id}`"
                    :class="getParagraphClass(block.para)"
                    @click="block.para.canRewrite ? selectParagraph(block.para.id) : undefined"
                  >
                    <!-- 封面区域：摘要之前，原样显示 -->
                    <template v-if="block.raw">
                      <p class="whitespace-pre-wrap" :style="buildInlineStyle(block.para)" v-if="block.para.status === 'replaced'" v-text="block.para.currentText" style="color: #166534;"></p>
                      <p class="whitespace-pre-wrap" :style="buildInlineStyle(block.para)" v-else v-text="block.para.currentText || block.para.originalText"></p>
                    </template>

                    <!-- 正文区域：正常渲染 -->
                    <template v-else>
                      <!-- 文本段落 -->
                      <template v-if="getEffectiveContentType(block.para) === 'text'">
                        <p
                          :style="buildInlineStyle(block.para) || buildHeadingStyle(parseStyle(block.para.styleData)) || 'font-size: 12pt; line-height: 1.8'"
                          v-if="block.para.status === 'replaced'"
                          v-html="renderTextWithCitations(block.para.currentText || '')"
                          style="color: #166534;"
                        ></p>
                        <p
                          :style="buildInlineStyle(block.para) || buildHeadingStyle(parseStyle(block.para.styleData)) || 'font-size: 12pt; line-height: 1.8'"
                          v-else
                          v-html="renderTextWithCitations(block.para.currentText || block.para.originalText || '')"
                        ></p>
                      </template>

                    <!-- 图片段落 -->
                    <template v-else-if="getEffectiveContentType(block.para) === 'image'">
                      <div class="my-3 space-y-2">
                        <div
                          v-for="(url, idx) in getImageUrls(block.para)"
                          :key="idx"
                          class="flex justify-center"
                        >
                          <img
                            :src="url"
                            alt="论文图片"
                            class="max-w-full h-auto rounded"
                            style="max-height: 400px;"
                            @error="($event.target as HTMLImageElement).style.display = 'none'"
                          />
                        </div>
                        <p v-if="block.para.originalText?.trim()" class="text-sm text-center text-muted-foreground">
                          {{ block.para.originalText }}
                        </p>
                      </div>
                    </template>

                    <!-- 表格 -->
                    <template v-else-if="getEffectiveContentType(block.para) === 'table'">
                      <div class="my-3 overflow-x-auto">
                        <table class="w-full border-collapse text-sm">
                          <template v-for="(row, ri) in parseTableData(block.para.tableData)" :key="ri">
                            <tr>
                              <td
                                v-for="(cell, ci) in row"
                                :key="ci"
                                class="border border-gray-300 px-3 py-2 text-left align-top"
                                :class="ri === 0 ? 'bg-gray-50 font-medium' : ''"
                              >
                                {{ cell.join('\n') }}
                              </td>
                            </tr>
                          </template>
                        </table>
                      </div>
                    </template>

                    </template>

                    <div
                      v-if="block.para.canRewrite && block.para.status !== 'original'"
                      class="absolute -right-0.5 top-0.5"
                    >
                      <span
                        class="text-[10px] px-1.5 py-0.5 rounded-full shadow-sm"
                        :class="{
                          'bg-yellow-100 text-yellow-700': block.para.status === 'loading',
                          'bg-blue-100 text-blue-700': block.para.status === 'rewritten',
                          'bg-green-100 text-green-700': block.para.status === 'replaced'
                        }"
                      >
                        {{ block.para.status === 'loading' ? '润色中' : block.para.status === 'rewritten' ? '已润色' : '已替换' }}
                      </span>
                    </div>
                  </div>
                </template>
              </template>
        </div>
        </div>
      </main>

      <!-- 右栏：润色操作面板 -->
      <aside
        v-if="selected"
        class="w-[380px] border-l bg-background overflow-y-auto shrink-0 flex flex-col"
      >
        <div class="p-4 border-b flex items-center justify-between">
          <div class="flex items-center gap-2">
            <FileText class="w-4 h-4 text-muted-foreground" />
            <span class="text-sm font-medium">段落 #{{ selected.paragraphIndex }}</span>
            <span class="text-xs text-muted-foreground">({{ selected.type }})</span>
          </div>
          <button @click="closePanel" class="text-muted-foreground hover:text-foreground transition-colors">
            <XCircle class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <Card class="p-4">
            <h3 class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">原文</h3>
            <p class="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
              {{ selected.originalText }}
            </p>
          </Card>

          <Card v-if="selected.status === 'loading'" class="p-4">
            <div class="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 class="w-4 h-4 animate-spin" />
              <span class="text-sm">AI 正在润色中...</span>
            </div>
          </Card>

          <Card v-if="selected.rewrittenText && selected.status !== 'loading'" class="p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-medium text-blue-600 uppercase tracking-wider">润色结果</h3>
              <div class="flex items-center gap-1.5">
                <Button
                  v-if="selected.status === 'rewritten' && !isEditing"
                  @click="startEditing"
                  variant="outline"
                  size="sm"
                >
                  编辑
                </Button>
                <Button
                  v-if="selected.status === 'rewritten'"
                  @click="handleAccept"
                  size="sm"
                  class="gap-1"
                >
                  <Check class="w-3.5 h-3.5" />
                  采纳
                </Button>
                <Button
                  v-if="selected.status === 'rewritten'"
                  @click="handleReject"
                  variant="outline"
                  size="sm"
                  class="gap-1 text-destructive hover:text-destructive"
                >
                  <X class="w-3.5 h-3.5" />
                  放弃
                </Button>
              </div>
            </div>
            <div v-if="isEditing">
              <textarea
                v-model="editingText"
                class="w-full min-h-[140px] p-3 rounded-md border bg-background text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div class="flex justify-end gap-2 mt-2">
                <Button size="sm" @click="handleAccept" class="gap-1">
                  <Check class="w-3.5 h-3.5" />
                  采纳修改
                </Button>
                <Button size="sm" variant="outline" @click="isEditing = false">取消</Button>
              </div>
            </div>
            <p v-else class="text-sm leading-relaxed whitespace-pre-wrap text-blue-900/80">
              {{ selected.rewrittenText }}
            </p>
          </Card>

          <Card v-if="selected.status === 'replaced'" class="p-4 border-green-200 bg-green-50/50">
            <h3 class="text-xs font-medium text-green-700 mb-2 uppercase tracking-wider">已采纳</h3>
            <p class="text-sm leading-relaxed whitespace-pre-wrap text-green-900">
              {{ selected.currentText }}
            </p>
          </Card>
        </div>

        <div class="p-4 border-t space-y-2">
          <Button
            v-if="selected.canRewrite && selected.status === 'original'"
            @click="handleRewrite"
            class="w-full gap-2"
          >
            <Wand2 class="w-4 h-4" />
            AI 润色
          </Button>
          <Button
            v-if="selected.status === 'rewritten' || selected.status === 'replaced'"
            @click="handleRewrite"
            variant="outline"
            class="w-full gap-2"
          >
            <RefreshCw class="w-4 h-4" />
            重新润色
          </Button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style>
@import 'highlight.js/styles/atom-one-light.css';
</style>

<style scoped>
.text-indent {
  text-indent: 2em;
}
</style>
