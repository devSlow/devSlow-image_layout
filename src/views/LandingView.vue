<script setup lang="ts">
import { useRouter } from 'vue-router'
import { FileText, Wand2, Shield, Zap, ArrowRight, Sparkles, BarChart3, Presentation } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

const router = useRouter()
const currentYear = new Date().getFullYear()

function handlePptClick() {
  router.push('/ppt')
}

function scrollToIntro() {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}

const features = [
  {
    icon: Wand2,
    title: 'AI 智能润色',
    desc: '两轮润色策略，先自然化再降AI率，显著降低查重率与AI检测率'
  },
  {
    icon: FileText,
    title: '段落级可视化编辑',
    desc: '逐段选中、逐段润色，结果实时预览，支持跨段落选区操作'
  },
  {
    icon: Shield,
    title: '质量评分系统',
    desc: '7维AI评分机制，确保润色后的文本保持学术水准与可读性'
  },
  {
    icon: Zap,
    title: '秒级响应',
    desc: '平均3秒完成一轮润色，无需等待，实时反馈处理进度'
  }
]

const steps = [
  {
    num: '01',
    title: '上传文档',
    desc: '支持 .docx 格式，自动解析段落结构与图片表格'
  },
  {
    num: '02',
    title: '选区润色',
    desc: '鼠标拖选需要润色的段落，一键触发AI两轮润色'
  },
  {
    num: '03',
    title: '预览采纳',
    desc: '查看润色结果与质量评分，满意后点击接受替换原文'
  },
  {
    num: '04',
    title: '导出文档',
    desc: '一键导出润色后的 .docx 文件，保持原文档排版格式'
  }
]

const stats = [
  { value: '10K+', label: '已处理文档' },
  { value: '98%', label: '用户满意度' },
  { value: '3s', label: '平均润色时间' },
  { value: '50%', label: 'AI率降低幅度' }
]
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles class="w-4 h-4 text-primary" />
          </div>
          <span class="text-lg font-bold tracking-tight">PaperPolish</span>
        </div>
        <div class="flex items-center gap-4">
          <button @click="scrollToIntro" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
            了解更多
          </button>
          <Button @click="router.push('/quick')" class="text-sm">
            立即体验
            <ArrowRight class="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="max-w-7xl mx-auto px-4 py-24 md:py-32 text-center">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-sm text-primary mb-6">
        <Sparkles class="w-4 h-4" />
        AI 驱动 · 两轮润色 · 可视化编辑
      </div>
      <h1 class="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
        论文降重，从未如此<br/>
        <span class="text-primary">简单高效</span>
      </h1>
      <p class="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        基于 AI 大模型的双轮润色策略，段落级可视化编辑，<br class="hidden md:block"/>
        显著降低查重率与 AI 检测率，保持学术水准
      </p>
      <div class="mt-10 flex items-center justify-center gap-4">
        <Button @click="router.push('/quick')" class="text-base px-8 py-3">
          <Wand2 class="w-5 h-5 mr-2" />
          快速降重
        </Button>
        <div class="relative">
          <button @click="handlePptClick" class="inline-flex items-center justify-center rounded-md border bg-background px-8 py-3 text-base font-medium hover:bg-accent transition-colors cursor-pointer">
            <Presentation class="w-5 h-5 mr-2" />
            生成PPT
          </button>
          <span class="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold text-white bg-primary rounded-full shadow-sm">Beta</span>
        </div>
        <div class="relative">
          <button @click="router.push('/upload')" class="inline-flex items-center justify-center rounded-md border bg-background px-8 py-3 text-base font-medium hover:bg-accent transition-colors cursor-pointer">
            <FileText class="w-5 h-5 mr-2" />
            上传文档
          </button>
          <span class="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-bold text-white bg-orange-500 rounded-full shadow-sm">内测</span>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="max-w-5xl mx-auto px-4 pb-24">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div v-for="stat in stats" :key="stat.label" class="text-center">
          <div class="text-3xl md:text-4xl font-bold text-primary">{{ stat.value }}</div>
          <div class="mt-1 text-sm text-muted-foreground">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="max-w-7xl mx-auto px-4 py-24">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold tracking-tight">核心功能</h2>
        <p class="mt-4 text-muted-foreground max-w-xl mx-auto">
          从上传到导出，全流程 AI 辅助，让论文降重不再是难题
        </p>
      </div>
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="p-6 rounded-xl border bg-background hover:border-primary/50 transition-colors group"
        >
          <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
            <component :is="feature.icon" class="w-6 h-6 text-primary" />
          </div>
          <h3 class="text-lg font-semibold mb-2">{{ feature.title }}</h3>
          <p class="text-sm text-muted-foreground leading-relaxed">{{ feature.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Steps -->
    <section class="bg-muted/50 py-24">
      <div class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold tracking-tight">使用流程</h2>
          <p class="mt-4 text-muted-foreground max-w-xl mx-auto">
            仅需四步，轻松完成论文降重润色
          </p>
        </div>
        <div class="grid md:grid-cols-4 gap-8">
          <div v-for="(step, idx) in steps" :key="step.num" class="relative">
            <div class="text-5xl font-bold text-primary/10 mb-4">{{ step.num }}</div>
            <h3 class="text-xl font-semibold mb-2">{{ step.title }}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">{{ step.desc }}</p>
            <div v-if="idx < steps.length - 1" class="hidden md:block absolute top-8 -right-4 text-muted-foreground/30">
              <ArrowRight class="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-4xl mx-auto px-4 py-24 text-center">
      <div class="p-12 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
        <BarChart3 class="w-12 h-12 text-primary mx-auto mb-6" />
        <h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          准备好开始了吗？
        </h2>
        <p class="text-muted-foreground max-w-lg mx-auto mb-8">
          粘贴文本或上传文档，AI 将为你提供专业的降重润色建议
        </p>
        <Button @click="router.push('/quick')" class="text-base px-8 py-3">
          立即体验
          <ArrowRight class="w-5 h-5 ml-2" />
        </Button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t py-12">
      <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles class="w-3 h-3 text-primary" />
          </div>
          <span class="text-sm font-semibold">PaperPolish</span>
        </div>
        <p class="text-sm text-muted-foreground">
          © {{ currentYear }} PaperPolish. All rights reserved.
        </p>
        <div class="flex items-center gap-4">
          <a href="#" class="text-sm text-muted-foreground hover:text-foreground transition-colors">隐私政策</a>
          <a href="#" class="text-sm text-muted-foreground hover:text-foreground transition-colors">服务条款</a>
        </div>
      </div>
    </footer>
  </div>
</template>
