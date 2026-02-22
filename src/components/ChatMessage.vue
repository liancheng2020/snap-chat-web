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
// 错误消息：以特定前缀开头的 assistant 消息
const isError = computed(() => !isUser.value && props.message.content.startsWith('__ERROR__:'))
const errorText = computed(() => (isError.value ? props.message.content.slice('__ERROR__:'.length).trim() : ''))
const htmlContent = computed(() => {
  if (isUser.value || isError.value) return ''
  return renderMarkdown(props.message.content)
})
const hasFiles = computed(() => props.message.files && props.message.files.length > 0)
const imageFiles = computed(() => props.message.files?.filter((f) => f.type === 'image') ?? [])
const docFiles = computed(() => props.message.files?.filter((f) => f.type === 'document') ?? [])

function copyContent() {
  emit('copy', props.message.content)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="message" :class="isUser ? 'message--user' : 'message--assistant'">
    <div class="message__avatar">
      <span v-if="isUser" class="avatar avatar--user">你</span>
      <span v-else class="avatar avatar--ai">AI</span>
    </div>
    <div class="message__body">
      <!-- 附件区域（消息气泡上方） -->
      <div v-if="hasFiles" class="message__files">
        <!-- 图片网格 -->
        <div v-if="imageFiles.length > 0" class="file-images">
          <img v-for="img in imageFiles" :key="img.id" :src="img.previewUrl" :alt="img.name" class="file-image" />
        </div>
        <!-- 文档列表 -->
        <div v-if="docFiles.length > 0" class="file-docs">
          <div v-for="doc in docFiles" :key="doc.id" class="file-doc">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span class="file-doc__name">{{ doc.name }}</span>
            <span class="file-doc__size">{{ formatSize(doc.size) }}</span>
          </div>
        </div>
      </div>

      <div v-if="message.content || isStreaming" class="message__content" :class="{ 'message__content--error': isError }">
        <!-- 用户消息：纯文本 -->
        <pre v-if="isUser" class="message__text">{{ message.content }}</pre>
        <!-- 错误消息 -->
        <div v-else-if="isError" class="message__error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="flex-shrink: 0; margin-top: 1px"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{{ errorText }}</span>
        </div>
        <!-- AI消息：Markdown渲染 -->
        <div v-else class="message__markdown markdown-body" v-html="htmlContent" />
        <!-- 流式加载光标：内容为空时独占一行，有内容时跟在文字后 -->
        <span v-if="isStreaming && !isUser && !isError" class="cursor-blink" :class="{ 'cursor-blink--alone': !message.content }" />
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
/* 附件样式 */
.message__files {
  margin-bottom: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message--user .message__files {
  align-items: flex-end;
}

.file-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.file-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.file-docs {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-doc {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  font-size: 12px;
  max-width: 260px;
}

.file-doc__name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text);
  font-size: 12px;
}

.file-doc__size {
  font-size: 11px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* 消息基础布局 */
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

.message__content--error {
  background: #fef2f2 !important;
  border-color: #fca5a5 !important;
}

.message__error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  color: #dc2626;
  font-size: 13.5px;
  line-height: 1.6;
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

/* 内容为空时光标独占，给消息框一个最小高度 */
.cursor-blink--alone {
  display: block;
  margin-left: 0;
  height: 1.2em;
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
