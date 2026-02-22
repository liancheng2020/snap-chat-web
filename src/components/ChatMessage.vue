<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/api/markdown'
import type { Message } from '@/types'

const props = defineProps<{
  message: Message
  isStreaming?: boolean
}>()

const emit = defineEmits<{
  copy: [content: string]
  regenerate: []
}>()

const isUser = computed(() => props.message.role === 'user')
const htmlContent = computed(() => {
  if (isUser.value) return ''
  return renderMarkdown(props.message.content)
})

function copyContent() {
  emit('copy', props.message.content)
}
</script>

<template>
  <div class="message" :class="isUser ? 'message--user' : 'message--assistant'">
    <div class="message__avatar">
      <span v-if="isUser" class="avatar avatar--user">你</span>
      <span v-else class="avatar avatar--ai">AI</span>
    </div>
    <div class="message__body">
      <div class="message__content">
        <!-- 用户消息：纯文本 -->
        <pre v-if="isUser" class="message__text">{{ message.content }}</pre>
        <!-- AI消息：Markdown渲染 -->
        <div v-else class="message__markdown markdown-body" v-html="htmlContent" />
        <!-- 流式加载光标 -->
        <span v-if="isStreaming && !isUser" class="cursor-blink" />
      </div>
      <!-- 操作按钮 -->
      <div class="message__actions">
        <button class="action-btn" title="复制" @click="copyContent">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          复制
        </button>
        <button v-if="!isUser" class="action-btn" title="重新生成" @click="emit('regenerate')">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
          </svg>
          重新生成
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message--user {
  flex-direction: row-reverse;
}

.message__avatar {
  flex-shrink: 0;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.avatar--user {
  background: var(--color-primary);
  color: #fff;
}

.avatar--ai {
  background: var(--color-surface-2);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.message__body {
  max-width: 80%;
  min-width: 0;
}

.message--user .message__body {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
}

.message__content {
  position: relative;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 14px;
  word-break: break-word;
}

.message--user .message__content {
  background: var(--color-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message--assistant .message__content {
  background: var(--color-surface-2);
  color: var(--color-text);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--color-border);
}

.message__text {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: inherit;
}

.cursor-blink {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: currentColor;
  vertical-align: text-bottom;
  margin-left: 2px;
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.message__actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}

.message:hover .message__actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}
</style>
