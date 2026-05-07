<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPaperInfo, getParagraphs, rewriteParagraph, acceptParagraph, rejectParagraph, exportDocument, getRemainingUsage, scoreParagraph, generatePpt } from '@/api/document'
import type { ParagraphItem, PaperInfo } from '@/api/types'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import { ArrowLeft, Wand2, Check, X, Download, Loader2, RefreshCw, XCircle, List, FileText, Eye, Clock, PanelLeftClose, PanelLeft, Presentation } from 'lucide-vue-next'
import { toast } from '@/composables/useToast'
import { getDeviceId } from '@/lib/utils'
import TocItem from '@/components/TocItem.vue'
import type { TocNode as TocNodeType } from '@/components/TocItem.vue'

const route = useRoute()
const paperId = route.params.paperId as string

const paperInfo = ref<PaperInfo | null>(null)
const paragraphs = ref<ParagraphItem[]>([])
const selectedId = ref<string | null>(null)
const loading = ref(false)
const exporting = ref(false)
const generatingPpt = ref(false)
const editingText = ref('')
const isEditing = ref(false)
const previewRef = ref<HTMLElement | null>(null)
const remainCount = ref<number | null>(null)
const sidebarWidth = ref(240)
const resizing = ref(false)
const tocVisible = ref(true)
const expandedTocNodes = ref<Set<string>>(new Set())
const scoreResult = ref<{ total: number; level: string; directness: number; rhythm: number; trustworthiness: number; authenticity: number; conciseness: number; semanticFidelity: number; purity: number } | null>(null)
const isLocked = ref(false)
const roundProgress = ref('')
const rightPanelVisible = ref(false)

const selectedRange = ref<{
  paraId: string
  paraIndex: number
  start: number
  end: number
  text: string
} | null>(null)

const selectedRanges = ref<Array<{
  paraId: string
  paraIndex: number
  start: number
  end: number
  text: string
}>>([])

function handleMouseUp() {
  if (isLocked.value) return
  setTimeout(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      selectedRange.value = null
      selectedRanges.value = []
      selectedId.value = null
      return
    }

    const range = sel.getRangeAt(0)
    const startParaEl = (range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer) as HTMLElement | null
    const endParaEl = (range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer) as HTMLElement | null

    if (!startParaEl || !endParaEl) return
    if (previewRef.value && (!previewRef.value.contains(startParaEl) || !previewRef.value.contains(endParaEl))) return

    const startParaContainer = startParaEl.closest('[id^="para-"]')
    const endParaContainer = endParaEl.closest('[id^="para-"]')
    if (!startParaContainer || !endParaContainer) {
      selectedRange.value = null
      selectedRanges.value = []
      selectedId.value = null
      return
    }

    const text = sel.toString().trim()
    if (!text) {
      selectedRange.value = null
      selectedRanges.value = []
      selectedId.value = null
      return
    }

    if (!previewRef.value) return

    const ranges: Array<{ paraId: string; paraIndex: number; start: number; end: number; text: string }> = []
    const allParaEls = previewRef.value.querySelectorAll('[id^="para-"]')
    const paraIdList: string[] = []
    allParaEls.forEach(el => paraIdList.push(el.id.replace('para-', '')))

    const startId = startParaContainer.id.replace('para-', '')
    const endId = endParaContainer.id.replace('para-', '')
    const startIdx = paraIdList.indexOf(startId)
    const endIdx = paraIdList.indexOf(endId)

    for (let i = startIdx; i <= endIdx; i++) {
      const paraId = paraIdList[i]
      const para = paragraphs.value.find(p => p.id === paraId)
      if (!para || !para.originalText) continue

      const paraEl = document.getElementById(`para-${paraId}`)
      if (!paraEl) continue

      if (i === startIdx && i === endIdx) {
        // 单段落选区
        const selectedText = text
        const original = para.originalText || ''
        let start = original.indexOf(selectedText)

        if (start === -1) {
          const normalizedOriginal = original.replace(/\s+/g, ' ').trim()
          const normalizedSelected = selectedText.replace(/\s+/g, ' ').trim()
          start = normalizedOriginal.indexOf(normalizedSelected)
        }

        if (start === -1) {
          // 匹配失败，降级为全文模式
          selectedRange.value = null
          selectedRanges.value = []
          selectedId.value = paraId
          return
        }

        ranges.push({
          paraId,
          paraIndex: para.paragraphIndex,
          start,
          end: start + selectedText.length,
          text: selectedText
        })
      } else if (i === startIdx) {
        // 起始段落：从 startOffset 到末尾
        const original = para.originalText
        const nodeText = (range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.textContent : '') || ''
        const offsetInNode = range.startOffset
        const charCountInNode = nodeText.length - offsetInNode
        // 简化：取从 startOffset 后的所有内容
        const selectedText = text.substring(0, Math.min(text.length, original.length))
        const start = original.indexOf(selectedText)
        if (start !== -1) {
          ranges.push({
            paraId,
            paraIndex: para.paragraphIndex,
            start,
            end: start + selectedText.length,
            text: selectedText
          })
        } else {
          ranges.push({
            paraId,
            paraIndex: para.paragraphIndex,
            start: 0,
            end: original.length,
            text: original
          })
        }
      } else if (i === endIdx) {
        // 结束段落：从开头到 endOffset
        const original = para.originalText
        const nodeText = (range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.textContent : '') || ''
        const offsetInNode = range.endOffset
        const charCountInNode = offsetInNode
        const selectedText = text.substring(text.length - Math.min(text.length, original.length))
        const start = original.indexOf(selectedText)
        if (start !== -1) {
          ranges.push({
            paraId,
            paraIndex: para.paragraphIndex,
            start,
            end: start + selectedText.length,
            text: selectedText
          })
        } else {
          ranges.push({
            paraId,
            paraIndex: para.paragraphIndex,
            start: 0,
            end: original.length,
            text: original
          })
        }
      } else {
        // 中间段落：整段选中
        const original = para.originalText
        ranges.push({
          paraId,
          paraIndex: para.paragraphIndex,
          start: 0,
          end: original.length,
          text: original
        })
      }
    }

    if (ranges.length === 0) {
      selectedRange.value = null
      selectedRanges.value = []
      selectedId.value = null
      return
    }

    selectedRanges.value = ranges
    selectedRange.value = ranges.length === 1 ? ranges[0] : {
      paraId: ranges[0].paraId,
      paraIndex: ranges[0].paraIndex,
      start: ranges[0].start,
      end: ranges[ranges.length - 1].end,
      text: ranges.map(r => r.text).join('\n')
    }
    selectedId.value = ranges[0].paraId
  }, 10)
}

onMounted(async () => {
  try {
    const res = await getRemainingUsage(getDeviceId())
    remainCount.value = res.data.remain
  } catch (e) {
    remainCount.value = 10
  }

  await loadData()

  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', handleMouseUp)
})

const canRewrite = computed(() => remainCount.value !== null && remainCount.value > 0)
const selected = computed(() => paragraphs.value.find(p => p.id === selectedId.value))

const headings = computed(() =>
  paragraphs.value.filter(p =>
    (p.type === 'heading' || isHeadingText(p.originalText || '')) && p.originalText?.trim()
  )
)

interface TocNode {
  id: string
  text: string
  depth: number
  children: TocNode[]
  para: ParagraphItem
}

const tocTree = computed(() => {
  const hList = headings.value.map(h => ({
    id: h.id,
    text: h.originalText?.trim() || '',
    depth: getHeadingDepth(h),
    children: [] as TocNode[],
    para: h
  }))

  const root: TocNode[] = []
  const stack: TocNode[] = []

  for (const item of hList) {
    while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(item as TocNode)
    } else {
      stack[stack.length - 1].children.push(item as TocNode)
    }
    stack.push(item as TocNode)
  }

  return root
})

const allTocIds = computed(() => {
  const ids: string[] = []
  function collect(nodes: TocNode[]) {
    for (const n of nodes) {
      ids.push(n.id)
      collect(n.children)
    }
  }
  collect(tocTree.value)
  return ids
})

function toggleToc(id: string) {
  const next = new Set(expandedTocNodes.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedTocNodes.value = next
}

function isTocExpanded(id: string): boolean {
  return expandedTocNodes.value.has(id)
}

function startResize(e: MouseEvent) {
  e.preventDefault()
  resizing.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  function onMove(ev: MouseEvent) {
    const delta = ev.clientX - startX
    sidebarWidth.value = Math.max(180, Math.min(500, startWidth + delta))
  }

  function onUp() {
    resizing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const rewriteStats = computed(() => {
  const canRewrite = paragraphs.value.filter(p => p.canRewrite).length
  const rewritten = paragraphs.value.filter(p => p.status === 'replaced').length
  return { canRewrite, rewritten }
})

async function loadData() {
  loading.value = true
  try {
    const [infoRes, paraRes] = await Promise.all([getPaperInfo(paperId), getParagraphs(paperId)])
    paperInfo.value = infoRes.data
    paragraphs.value = paraRes.data.paragraphs
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleRewrite() {
  const isMulti = selectedRanges.value.length > 1
  const targetPara = selectedRange.value
    ? paragraphs.value.find(p => p.id === selectedRange.value!.paraId)
    : selected.value

  if (!targetPara) return
  
  // 保存当前选中的段落ID，防止润色过程中面板关闭
  const currentSelectedId = selectedId.value
  
  if (!canRewrite.value) {
    toast.warning('今日免费次数已用完，请先兑换')
    return
  }

  const isSelection = !!selectedRange.value
  const originalText = isSelection
    ? selectedRange.value!.text
    : (targetPara.originalText || '')

  if (!originalText) return

  if (isMulti) {
    for (const r of selectedRanges.value) {
      const p = paragraphs.value.find(p => p.id === r.paraId)
      if (p) p.status = 'loading'
    }
  } else {
    const idx = paragraphs.value.findIndex(p => p.id === targetPara.id)
    if (idx !== -1) paragraphs.value[idx].status = 'loading'
  }

  scoreResult.value = null
  isLocked.value = true
  roundProgress.value = '第1轮润色中 · 自然化...'

  try {
    const res1 = await rewriteParagraph(paperId, targetPara.id, getDeviceId(), originalText, 1)
    if (!canRewrite.value) {
    toast.warning('今日免费次数已用完，请先兑换')
      resetParagraphStatus()
      roundProgress.value = ''
      isLocked.value = false
      return
    }
    const round1Text = res1.data.rewrittenText

    roundProgress.value = '第2轮润色中 · 降AI率...'
    let res2: any
    try {
      res2 = await rewriteParagraph(paperId, targetPara.id, getDeviceId(), round1Text, 2)
    } catch (e2: any) {
      // 第2轮失败，降级使用第1轮结果
      console.warn('第2轮润色失败，使用第1轮结果:', e2.message)
      res2 = { data: { rewrittenText: round1Text } }
    }

    if (isMulti) {
      for (const r of selectedRanges.value) {
        const p = paragraphs.value.find(p => p.id === r.paraId)
        if (p) {
          p.rewrittenText = res2.data.rewrittenText
          p.status = 'done'
        }
      }
    } else {
      const idx = paragraphs.value.findIndex(p => p.id === targetPara.id)
      if (idx !== -1) {
        paragraphs.value[idx].rewrittenText = res2.data.rewrittenText
        paragraphs.value[idx].status = 'done'
      }
    }

    editingText.value = res2.data.rewrittenText
    roundProgress.value = ''
    isLocked.value = false
    
    // 确保selectedId不被清空，保持右侧面板显示
    if (!selectedId.value && currentSelectedId) {
      selectedId.value = currentSelectedId
    }

    // 润色完成后立即调用评分
    try {
      const finalText = res2.data.rewrittenText
      const scoreRes = await scoreParagraph(paperId, targetPara.id, originalText, finalText)
      scoreResult.value = scoreRes.data
    } catch (e) {
      // 评分失败不影响主流程
    }

    const remainRes = await getRemainingUsage(getDeviceId())
    remainCount.value = remainRes.data.remain
  } catch (e: any) {
    toast.error(e.message || '润色失败')
    resetParagraphStatus()
    roundProgress.value = ''
    isLocked.value = false
    // 确保selectedId不被清空
    if (!selectedId.value && currentSelectedId) {
      selectedId.value = currentSelectedId
    }
  }
}

function resetParagraphStatus() {
  if (selectedRanges.value.length > 1) {
    for (const r of selectedRanges.value) {
      const p = paragraphs.value.find(p => p.id === r.paraId)
      if (p) p.status = 'original'
    }
  } else {
    const p = selected.value
    if (p) {
      const idx = paragraphs.value.findIndex(x => x.id === p.id)
      if (idx !== -1) paragraphs.value[idx].status = 'original'
    }
  }
}

async function handleAccept() {
  const targetPara = selectedRange.value
    ? paragraphs.value.find(p => p.id === selectedRange.value!.paraId)
    : selected.value

  if (!targetPara) return

  try {
    const finalText = isEditing.value ? editingText.value : (targetPara.rewrittenText || targetPara.currentText)
    const idx = paragraphs.value.findIndex(p => p.id === targetPara.id)

    if (selectedRanges.value.length > 1) {
      // 跨段落模式：所有选中段落替换为润色结果
      for (const r of selectedRanges.value) {
        const p = paragraphs.value.find(p => p.id === r.paraId)
        if (p) {
          p.currentText = finalText
          p.originalText = finalText
          p.rewrittenText = null
          p.status = 'replaced'
        }
      }
    } else if (selectedRange.value) {
      // 选区模式：润色结果替换选中区域
      const { start, end } = selectedRange.value
      const original = targetPara.originalText || ''
      const mergedText = original.substring(0, start) + finalText + original.substring(end)

      if (idx !== -1) {
        paragraphs.value[idx].currentText = mergedText
        paragraphs.value[idx].originalText = mergedText
        paragraphs.value[idx].rewrittenText = null
        paragraphs.value[idx].status = 'replaced'
      }
    } else {
      // 全文模式：整段替换
      if (idx !== -1) {
        paragraphs.value[idx].currentText = finalText
        paragraphs.value[idx].originalText = finalText
        paragraphs.value[idx].rewrittenText = null
        paragraphs.value[idx].status = 'replaced'
      }
    }

    const res = await acceptParagraph(paperId, targetPara.id, finalText)
    scoreResult.value = res.data?.score || null
    isLocked.value = false
    selectedRange.value = null
    selectedRanges.value = []
    isEditing.value = false
    editingText.value = ''
  } catch (e: any) {
    toast.error(e.message || '操作失败')
  }
}

async function handleRegenerate() {
  scoreResult.value = null
  isEditing.value = false
  await handleRewrite()
}

function handleCancel() {
  if (selectedRanges.value.length > 1) {
    for (const r of selectedRanges.value) {
      const p = paragraphs.value.find(p => p.id === r.paraId)
      if (p) {
        p.rewrittenText = null
        p.status = 'original'
      }
    }
  } else {
    const idx = paragraphs.value.findIndex(p => p.id === selected.value?.id)
    if (idx !== -1) {
      paragraphs.value[idx].rewrittenText = null
      paragraphs.value[idx].status = 'original'
    }
  }
  isLocked.value = false
  selectedRange.value = null
  selectedRanges.value = []
  isEditing.value = false
  scoreResult.value = null
  editingText.value = ''
}

async function handleExport() {
  exporting.value = true
  try {
    const res = await exportDocument(paperId)
    const link = document.createElement('a')
    link.href = res.data.downloadUrl
    link.download = '润色后文档.docx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (e: any) {
    toast.error(e.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleGeneratePpt() {
  generatingPpt.value = true
  try {
    const res = await generatePpt(paperId, getDeviceId())
    const link = document.createElement('a')
    link.href = res.data.downloadUrl
    link.download = '论文演示.pptx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (e: any) {
    toast.error(e.message || '生成 PPT 失败')
  } finally {
    generatingPpt.value = false
  }
}

function closePanel() {
  // 只折叠面板，不清空选中状态
  rightPanelVisible.value = false
}

function clearSelection() {
  selectedId.value = null
  selectedRange.value = null
  selectedRanges.value = []
  isEditing.value = false
  editingText.value = ''
  scoreResult.value = null
}

function toggleRightPanel() {
  rightPanelVisible.value = !rightPanelVisible.value
}

watch(selected, (newVal) => {
  // 当选中段落时自动显示右侧面板
  if (newVal) {
    rightPanelVisible.value = true
  }
  if (newVal?.rewrittenText) {
    editingText.value = newVal.rewrittenText
  } else {
    editingText.value = ''
  }
}, { immediate: true })

function scrollToParagraph(id: string) {
  const el = document.getElementById(`para-${id}`)
  if (el && previewRef.value) {
    const container = previewRef.value
    const elRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    container.scrollTo({
      top: container.scrollTop + elRect.top - containerRect.top - container.clientHeight / 3,
      behavior: 'smooth'
    })
    selectedId.value = id
    selectedRange.value = null
  }
}

function getParagraphClass(para: ParagraphItem) {
  const isSelected = selectedRanges.value.length > 1
    ? selectedRanges.value.some(r => r.paraId === para.id)
    : selectedRange.value?.paraId === para.id
  const classes = ['relative', 'rounded', 'px-1', 'py-0.5', 'transition-all']

  if (para.canRewrite) {
    classes.push('cursor-text')
    if (isSelected) {
      classes.push('bg-primary/5')
    } else {
      classes.push('hover:bg-accent/50')
    }
  }

  if (para.status === 'replaced') {
    classes.push('bg-green-50/50')
  }

  return classes.join(' ')
}

const HEADING_KEYWORDS = /^(摘要|Abstract|ABSTRACT|参考文献|致谢|附录|引言|绪论|结论|目录|关键词|Keywords|KEYWORDS|Abstract\s*\d*)\s*$/i

function isHeadingText(text: string): boolean {
  const t = text.trim()
  if (!t) return false

  if (/^[一二三四五六七八九十百千万]+[、．.]/.test(t)) return true
  if (/^[（(]\s*[一二三四五六七八九十百千万]+\s*[）)]/.test(t)) return true
  if (/^第[一二三四五六七八九十百千万]+[章节篇部分条]/.test(t)) return true
  if (/^\d+(\.\d+)+/.test(t)) return true
  if (/^\d+\s/.test(t)) return true
  if (/^\d+[、．.]/.test(t)) return true
  if (/^[A-Z][、．.]/.test(t)) return true
  if (/^[（(]\s*\d+\s*[）)]/.test(t)) return true
  if (/^[IVXLCDMivxlcdm]+[、．.]/.test(t)) return true
  if (HEADING_KEYWORDS.test(t)) return true

  return false
}

function getHeadingDepth(para: ParagraphItem): number {
  const text = para.originalText?.trim() || ''

  // 第X章/篇/部分 -> 一级
  if (/^第[一二三四五六七八九十百千万]+[章篇部分]/.test(text)) return 0

  // 中文数字 + 标点 -> 一级
  if (/^[一二三四五六七八九十百千万]+[、．.]/.test(text)) return 0

  // 中文数字带括号 -> 二级
  if (/^[（(]\s*[一二三四五六七八九十百千万]+\s*[）)]/.test(text)) return 1

  // 第X节/条 -> 二级
  if (/^第[一二三四五六七八九十百千万]+[节条]/.test(text)) return 1

  // 阿拉伯数字编号：1 -> 一级，1.1 -> 二级，1.1.1 -> 三级，以此类推
  if (/^\d+(\.\d+)+/.test(text)) {
    const match = text.match(/^\d+(\.\d+)*/)?.[0].split('.') || []
    return match.length - 1
  }

  // 纯数字 + 空格/顿号 -> 一级
  if (/^\d+[\s　、．.]/.test(text)) return 0

  // 大写字母编号 -> 二级
  if (/^[A-Z][、．.\s]/.test(text)) return 1

  // 数字带括号 -> 三级
  if (/^[（(]\s*\d+\s*[）)]/.test(text)) return 2

  // 罗马数字 -> 一级
  if (/^[IVXLCDM]+[、．.\s]/.test(text)) return 0

  // 关键词标题 -> 一级
  if (HEADING_KEYWORDS.test(text)) return 0

  // 兜底：无法明确判断的标题文本 -> 一级
  return 1
}

function renderParagraphHtml(para: ParagraphItem): string {
  if (para.status === 'replaced' && para.currentText) {
    return `<p style="font-size: 12pt; line-height: 1.8;">${escapeHtml(para.currentText)}</p>`
  }

  const html = para.htmlContent
  if (!html) {
    const text = para.currentText || para.originalText || ''
    return `<p style="font-size: 12pt; line-height: 1.8;">${escapeHtml(text)}</p>`
  }

  return html
}

function escapeHtml(text: string): string {
  if (!text) return ''
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildFallbackTableHtml(tableData: string | null): string {
  if (!tableData) return ''
  try {
    const rows: string[][][] = JSON.parse(tableData)
    let html = '<div style="margin: 8px 0; overflow-x: auto;"><table style="width:100%;border-collapse:collapse;font-size:10.5pt;">'
    rows.forEach((row, ri) => {
      html += '<tr>'
      row.forEach((cell) => {
        const border = 'border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top;'
        html += `<td style="${border}${ri === 0 ? 'background-color:#f5f5f5;font-weight:500;' : ''}">${cell.map((c: string) => escapeHtml(c)).join('<br/>')}</td>`
      })
      html += '</tr>'
    })
    html += '</table></div>'
    return html
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-muted/30">
    <header class="border-b bg-background px-6 py-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <router-link to="/" class="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft class="w-5 h-5" />
        </router-link>
        <button @click="tocVisible = !tocVisible" class="p-1.5 rounded-md hover:bg-accent/50 transition-colors">
          <PanelLeftClose v-if="tocVisible" class="w-5 h-5 text-muted-foreground" />
          <PanelLeft v-else class="w-5 h-5 text-muted-foreground" />
        </button>
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
        <Button @click="handleGeneratePpt" :disabled="generatingPpt" variant="outline" class="gap-2">
          <Presentation v-if="!generatingPpt" class="w-4 h-4" />
          <Loader2 v-else class="w-4 h-4 animate-spin" />
          生成 PPT
        </Button>
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
      <aside
        class="border-r bg-background shrink-0 flex flex-col relative transition-all duration-200 ease-in-out"
        :style="{ width: tocVisible ? sidebarWidth + 'px' : '0px', overflow: tocVisible ? 'hidden' : 'hidden' }"
      >
        <div class="p-4 pb-2">
          <div class="flex items-center gap-2 mb-3">
            <List class="w-4 h-4 text-muted-foreground shrink-0" />
            <span class="text-sm font-medium text-muted-foreground whitespace-nowrap">目录</span>
            <span class="text-xs text-muted-foreground/50 ml-auto">{{ headings.length }} 项</span>
          </div>
        </div>
        <nav class="flex-1 overflow-y-auto px-2 pb-4">
          <template v-if="tocTree.length > 0">
            <TocItem
              v-for="node in tocTree"
              :key="node.id"
              :node="node"
              :expanded="isTocExpanded(node.id)"
              :all-expanded="expandedTocNodes"
              @toggle="toggleToc($event)"
              @select="scrollToParagraph"
            />
          </template>
          <div v-else class="text-xs text-muted-foreground/60 text-center py-4">
            暂无标题
          </div>
        </nav>
        <div
          class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors z-10"
          :class="resizing ? 'bg-primary/30' : ''"
          @mousedown="startResize"
        ></div>
      </aside>

       <!-- 中栏：论文预览 -->
       <main ref="previewRef" class="flex-1 overflow-y-auto bg-muted/30 py-8 px-6">
         <div class="max-w-[800px] mx-auto bg-white shadow-lg rounded-sm px-[60px] py-[56px]">
          <template v-for="para in paragraphs" :key="para.id">
            <!-- 封面区域：原样展示，不可交互 -->
            <div
              v-if="para.locationType === 'cover' && (para.originalText?.trim() || para.contentType === 'image' || para.contentType === 'table')"
              :id="`para-${para.id}`"
              class="whitespace-pre-wrap"
            >
              <div v-if="para.htmlContent" v-html="para.htmlContent"></div>
              <div v-else-if="para.contentType === 'table' && para.tableData" v-html="buildFallbackTableHtml(para.tableData)"></div>
              <p v-else style="font-size: 12pt; line-height: 1.8;">{{ para.currentText || para.originalText }}</p>
            </div>
            <!-- 正文区域：可交互 -->
            <div
              v-else-if="para.originalText?.trim() || para.contentType === 'image' || para.contentType === 'table'"
              :id="`para-${para.id}`"
              :class="getParagraphClass(para)"
            >
              <div v-html="renderParagraphHtml(para)"></div>

              <div
                v-if="para.canRewrite && para.status !== 'original'"
                class="absolute -right-0.5 top-0.5"
              >
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full shadow-sm"
                  :class="{
                    'bg-yellow-100 text-yellow-700': para.status === 'loading',
                    'bg-blue-100 text-blue-700': para.status === 'rewritten',
                    'bg-green-100 text-green-700': para.status === 'replaced'
                  }"
                >
                  {{ para.status === 'loading' ? '润色中' : para.status === 'rewritten' ? '已润色' : '已替换' }}
                </span>
              </div>
            </div>
           </template>
         </div>
       </main>

       <!-- 右侧面板切换按钮 -->
       <button 
         class="flex items-center justify-center w-5 bg-muted/30 border-l hover:bg-muted cursor-pointer transition-colors self-stretch"
         @click="toggleRightPanel"
         :title="rightPanelVisible ? '收起面板' : '展开面板'"
       >
         <span class="text-xs text-muted-foreground">{{ rightPanelVisible ? '›' : '‹' }}</span>
       </button>

       <!-- 右栏：润色操作面板 -->
       <aside
          class="bg-background border-l shrink-0 flex flex-col"
          :style="{ width: rightPanelVisible ? '380px' : '0px', opacity: rightPanelVisible ? 1 : 0, transition: 'width 0.2s ease-in-out, opacity 0.2s ease-in-out', pointerEvents: rightPanelVisible ? 'auto' : 'none' }"
       >
           <div class="flex flex-col h-full overflow-hidden">
           <template v-if="selected">
           <div class="p-4 border-b flex items-center justify-between">
             <div class="flex items-center gap-2">
               <FileText class="w-4 h-4 text-muted-foreground" />
               <span class="text-sm font-medium">
                 <template v-if="selectedRanges.length > 1">
                   已选 {{ selectedRanges.length }} 个段落
                   <span class="text-blue-600">(跨段落模式)</span>
                 </template>
                 <template v-else-if="selectedRange">
                   段落 #{{ selected.paragraphIndex }}
                   <span class="text-blue-600">(选区模式)</span>
                 </template>
                 <template v-else>
                   段落 #{{ selected.paragraphIndex }}
                 </template>
               </span>
             </div>
             <button @click="closePanel" class="text-muted-foreground hover:text-foreground transition-colors">
               <XCircle class="w-5 h-5" />
             </button>
           </div>

           <div class="flex-1 overflow-y-auto p-4 space-y-4">
             <!-- 原文卡片 -->
             <Card class="p-4">
               <div class="flex items-center justify-between mb-2">
                 <h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                   {{ selectedRanges.length > 1 ? '选中内容' : (selectedRange ? '选中内容' : '原文') }}
                 </h3>
                 <span class="text-[10px] text-muted-foreground">{{ selectedRange ? selectedRange.text.length : (selected.originalText || '').length }} 字</span>
               </div>
               <p class="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                 {{ selectedRange ? selectedRange.text : selected.originalText }}
               </p>
             </Card>

            <!-- 润色中状态 -->
            <Card v-if="selected.status === 'loading'" class="p-4">
              <div class="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 class="w-4 h-4 animate-spin" />
                <span class="text-sm">{{ roundProgress || 'AI 正在润色中...' }}</span>
              </div>
            </Card>

            <!-- 润色完成：最终结果 -->
            <Card v-if="selected.status === 'done'" class="p-4">
              <h3 class="text-xs font-medium text-green-600 mb-3 uppercase tracking-wider">润色结果</h3>
              <textarea
                v-model="editingText"
                class="w-full min-h-[140px] p-3 rounded-md border bg-background text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                @input="isEditing = true"
              />

              <!-- 评分结果 -->
              <div v-if="scoreResult" class="mt-3 pt-3 border-t">
                <h3 class="text-xs font-medium text-blue-600 mb-2 uppercase tracking-wider">质量评分</h3>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div class="flex justify-between"><span class="text-muted-foreground">直接性</span><span>{{ scoreResult.directness }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">节奏</span><span>{{ scoreResult.rhythm }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">信任度</span><span>{{ scoreResult.trustworthiness }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">真实性</span><span>{{ scoreResult.authenticity }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">精炼度</span><span>{{ scoreResult.conciseness }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">语义保真</span><span>{{ scoreResult.semanticFidelity }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">纯净输出</span><span>{{ scoreResult.purity }}/10</span></div>
                </div>
                <div class="mt-2 pt-2 border-t flex items-center justify-between">
                  <span class="text-sm font-medium">总分</span>
                  <span class="text-sm font-bold" :class="scoreResult.total >= 56 ? 'text-green-600' : scoreResult.total >= 42 ? 'text-blue-600' : 'text-orange-600'">
                    {{ scoreResult.total }}/70 · {{ scoreResult.level }}
                  </span>
                </div>
              </div>
            </Card>

            <!-- 已采纳 -->
            <Card v-if="selected.status === 'replaced'" class="p-4 border-green-200 bg-green-50/50">
              <h3 class="text-xs font-medium text-green-700 mb-2 uppercase tracking-wider">已采纳</h3>
              <p class="text-sm leading-relaxed whitespace-pre-wrap text-green-900">
                {{ selected.currentText }}
              </p>
              <!-- 评分结果 -->
              <div v-if="scoreResult" class="mt-3 pt-3 border-t border-green-200">
                <h3 class="text-xs font-medium text-blue-600 mb-2 uppercase tracking-wider">质量评分</h3>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div class="flex justify-between"><span class="text-muted-foreground">直接性</span><span>{{ scoreResult.directness }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">节奏</span><span>{{ scoreResult.rhythm }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">信任度</span><span>{{ scoreResult.trustworthiness }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">真实性</span><span>{{ scoreResult.authenticity }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">精炼度</span><span>{{ scoreResult.conciseness }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">语义保真</span><span>{{ scoreResult.semanticFidelity }}/10</span></div>
                  <div class="flex justify-between"><span class="text-muted-foreground">纯净输出</span><span>{{ scoreResult.purity }}/10</span></div>
                </div>
                <div class="mt-2 pt-2 border-t border-green-200 flex items-center justify-between">
                  <span class="text-sm font-medium">总分</span>
                  <span class="text-sm font-bold" :class="scoreResult.total >= 56 ? 'text-green-600' : scoreResult.total >= 42 ? 'text-blue-600' : 'text-orange-600'">
                    {{ scoreResult.total }}/70 · {{ scoreResult.level }}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div class="p-4 border-t space-y-2">
            <!-- 初始状态：润色按钮 -->
            <Button
              v-if="selected.canRewrite && selected.status === 'original' && !isLocked"
              @click.stop="handleRewrite"
              class="w-full gap-2"
            >
              <Wand2 class="w-4 h-4" />
              AI 润色（两轮）
            </Button>

            <!-- 润色完成：接受/重新生成/取消 -->
            <template v-if="selected.status === 'done'">
              <Button @click.stop="handleAccept" class="w-full gap-2">
                <Check class="w-4 h-4" />
                接受并替换原文
              </Button>
              <Button @click.stop="handleRegenerate" variant="outline" class="w-full gap-2">
                <RefreshCw class="w-4 h-4" />
                重新生成
              </Button>
              <Button @click.stop="handleCancel" variant="outline" class="w-full gap-2">
                <X class="w-4 h-4" />
                取消
              </Button>
            </template>

            <!-- 已采纳后：重新润色 -->
            <Button
              v-if="selected.status === 'replaced' && !isLocked"
              @click.stop="handleRewrite"
              variant="outline"
              class="w-full gap-2"
            >
              <RefreshCw class="w-4 h-4" />
              重新润色（两轮）
            </Button>
          </div>
           </template>
         </div>
       </aside>
    </div>
  </div>
</template>

<style scoped>
:deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
