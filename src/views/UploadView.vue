<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadDocument } from '@/api/document'
import { Upload, FileText, Loader2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'

const router = useRouter()
const isDragging = ref(false)
const isUploading = ref(false)
const errorMessage = ref('')

async function handleFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    errorMessage.value = '仅支持 .docx 格式文件'
    return
  }
  errorMessage.value = ''
  isUploading.value = true
  try {
    const res = await uploadDocument(file)
    router.push({ name: 'editor', params: { paperId: res.data.paperId } })
  } catch (e: any) {
    errorMessage.value = e.message || '上传失败'
  } finally {
    isUploading.value = false
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-muted/50 p-4">
    <div class="w-full max-w-xl">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold tracking-tight">PaperPolish</h1>
        <p class="text-muted-foreground mt-2">可视化段落级论文降重润色工具</p>
      </div>

      <Card class="p-8">
        <div
          class="border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer"
          :class="isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
          @click="($refs.fileInput as HTMLInputElement)?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".docx"
            class="hidden"
            @change="onFileChange"
          />
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload class="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p class="text-lg font-medium">拖拽文件到此处，或点击上传</p>
              <p class="text-sm text-muted-foreground mt-1">支持 .docx 格式</p>
            </div>
          </div>
        </div>

        <div v-if="isUploading" class="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 class="w-4 h-4 animate-spin" />
          <span class="text-sm">正在上传并解析文档...</span>
        </div>

        <div v-if="errorMessage" class="mt-4 text-center text-sm text-destructive">
          {{ errorMessage }}
        </div>
      </Card>

      <div class="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div class="flex items-center gap-1.5">
          <FileText class="w-4 h-4" />
          <span>上传 Word 文档</span>
        </div>
        <span>→</span>
        <span>逐段 AI 润色</span>
        <span>→</span>
        <span>导出下载</span>
      </div>
    </div>
  </div>
</template>
