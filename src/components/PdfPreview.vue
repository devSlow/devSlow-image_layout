<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

const props = defineProps<{ paperId: string }>()

const loading = ref(true)
const currentPage = ref(1)
const totalPages = ref(0)
const rendering = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)
let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null

async function loadPdf() {
  loading.value = true
  try {
    const url = `/api/document/${props.paperId}/pdf`
    const loadingTask = pdfjsLib.getDocument(url)
    pdfDoc = await loadingTask.promise
    totalPages.value = pdfDoc.numPages
    currentPage.value = 1
    await renderPage(1)
  } catch (e: any) {
    console.error('PDF 加载失败:', e)
  } finally {
    loading.value = false
  }
}

async function renderPage(pageNum: number) {
  if (!pdfDoc || !containerRef.value || rendering.value) return
  rendering.value = true
  try {
    const page = await pdfDoc.getPage(pageNum)
    const containerWidth = containerRef.value.clientWidth - 24
    const viewport = page.getViewport({ scale: 1 })
    const scale = containerWidth / viewport.width
    const scaledViewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = scaledViewport.width * (window.devicePixelRatio || 1)
    canvas.height = scaledViewport.height * (window.devicePixelRatio || 1)
    canvas.style.width = scaledViewport.width + 'px'
    canvas.style.height = scaledViewport.height + 'px'

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise

    containerRef.value.innerHTML = ''
    containerRef.value.appendChild(canvas)
  } catch (e) {
    console.error('渲染页面失败:', e)
  } finally {
    rendering.value = false
  }
}

async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  await nextTick()
  await renderPage(page)
}

function handleScroll(e: Event) {
  const el = e.target as HTMLElement
  if (!el) return
  const rect = el.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const elAtPoint = document.elementFromPoint(centerX, centerY)
  if (elAtPoint?.closest('.pdf-page-nav')) return
}

watch(() => props.paperId, () => {
  if (props.paperId) loadPdf()
})

onMounted(() => {
  if (props.paperId) loadPdf()
})

onUnmounted(() => {
  if (pdfDoc) {
    pdfDoc.destroy()
    pdfDoc = null
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-2 text-muted-foreground">
        <Loader2 class="w-5 h-5 animate-spin" />
        <span class="text-sm">PDF 加载中...</span>
      </div>
    </div>

    <template v-else>
      <div class="flex-1 overflow-y-auto p-3 bg-gray-100/50" ref="containerRef" @scroll="handleScroll">
      </div>

      <div v-if="totalPages > 0" class="pdf-page-nav flex items-center justify-center gap-2 py-2 border-t bg-background">
        <Button variant="outline" size="sm" @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <span class="text-sm text-muted-foreground min-w-[80px] text-center">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <Button variant="outline" size="sm" @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages">
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </template>
  </div>
</template>
