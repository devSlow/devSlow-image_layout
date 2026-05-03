<script setup lang="ts">
import { ChevronRight, ChevronDown } from 'lucide-vue-next'

export interface TocNode {
  id: string
  text: string
  depth: number
  children: TocNode[]
}

defineProps<{
  node: TocNode
  expanded: boolean
  allExpanded: Set<string>
}>()

const emit = defineEmits<{
  toggle: [id: string]
  select: [id: string]
}>()
</script>

<template>
  <div>
    <div
      class="flex items-center gap-0.5 py-1 px-1 rounded-md transition-colors hover:bg-accent/50 text-muted-foreground hover:text-foreground cursor-pointer"
      :style="{ paddingLeft: `${4 + node.depth * 12}px` }"
    >
      <span
        v-if="node.children.length > 0"
        class="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground/50 hover:text-foreground"
        @click.stop="emit('toggle', node.id)"
      >
        <ChevronDown v-if="expanded" class="w-3.5 h-3.5" />
        <ChevronRight v-else class="w-3.5 h-3.5" />
      </span>
      <span v-else class="shrink-0 w-4" />
      <span
        class="text-[13px] leading-snug break-all line-clamp-3"
        @click="emit('select', node.id)"
        :title="node.text"
      >
        {{ node.text }}
      </span>
    </div>
    <div v-if="node.children.length > 0 && expanded">
      <TocItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :expanded="allExpanded.has(child.id)"
        :all-expanded="allExpanded"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
