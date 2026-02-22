<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { AttachedFile } from '@/types'

const ACCEPT_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
const ACCEPT_DOC = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
const ACCEPT_ALL = [...ACCEPT_IMAGE, ...ACCEPT_DOC]
const ACCEPT_ATTR = ACCEPT_ALL.join(',')
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const props = defineProps<{ loading: boolean }>()
const emit = defineEmits<{
  send: [content: string, files: AttachedFile[]]
  stop: []
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const attachedFiles = ref<AttachedFile[]>([])
const isDragging = ref(false)
const fileError = ref<string | null>(null)

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

async function handleSend() {
  const content = input.value.trim()
  if ((!content && attachedFiles.value.length === 0) || props.loading) return
  const files = [...attachedFiles.value]
  input.value = ''
  attachedFiles.value = []
  fileError.value = null
  await nextTick()
  autoResize()
  emit('send', content, files)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

async function readFile(file: File): Promise<AttachedFile | null> {
  if (!ACCEPT_ALL.includes(file.type)) {
    fileError.value = `不支持的文件格式：${file.name}`
    return null
  }
  if (file.size > MAX_FILE_SIZE) {
    fileError.value = `文件过大（最大 20MB）：${file.name}`
    return null
  }

  const isImage = ACCEPT_IMAGE.includes(file.type)

  return new Promise((resolve) => {
    const reader = new FileReader()
    if (isImage) {
      reader.readAsDataURL(file)
      reader.onload = () =>
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          type: 'image',
          mimeType: file.type,
          size: file.size,
          data: reader.result as string,
          previewUrl: reader.result as string
        })
    } else {
      reader.readAsText(file, 'utf-8')
      reader.onload = () =>
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          type: 'document',
          mimeType: file.type,
          size: file.size,
          data: reader.result as string
        })
    }
    reader.onerror = () => {
      fileError.value = `读取文件失败：${file.name}`
      resolve(null)
    }
  })
}

async function processFiles(fileList: FileList | File[]) {
  fileError.value = null
  const files = Array.from(fileList)
  for (const file of files) {
    if (attachedFiles.value.length >= 5) {
      fileError.value = '最多同时上传 5 个文件'
      break
    }
    const result = await readFile(file)
    if (result) attachedFiles.value.push(result)
  }
}

function onFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) processFiles(target.files)
  target.value = ''
}

function removeFile(id: string) {
  attachedFiles.value = attachedFiles.value.filter((f) => f.id !== id)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function onDragover(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}
function onDragleave() {
  isDragging.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  if (e.dataTransfer?.files) processFiles(e.dataTransfer.files)
}
</script>

<template>
  <div class="chat-input" :class="{ 'chat-input--dragging': isDragging }" @dragover="onDragover" @dragleave="onDragleave" @drop="onDrop">
    <!-- 文件预览区 -->
    <div v-if="attachedFiles.length > 0" class="file-previews">
      <div v-for="file in attachedFiles" :key="file.id" class="file-chip">
        <img v-if="file.type === 'image'" :src="file.previewUrl" class="file-chip__thumb" :alt="file.name" />
        <div v-else class="file-chip__icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div class="file-chip__info">
          <span class="file-chip__name">{{ file.name }}</span>
          <span class="file-chip__size">{{ formatSize(file.size) }}</span>
        </div>
        <button class="file-chip__remove" @click="removeFile(file.id)">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="fileError" class="file-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ fileError }}
      <button @click="fileError = null">✕</button>
    </div>

    <div class="chat-input__inner">
      <!-- 上传按钮 -->
      <button class="upload-btn" title="上传文件或图片" :disabled="loading || attachedFiles.length >= 5" @click="fileInputRef?.click()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
      <input ref="fileInputRef" type="file" multiple :accept="ACCEPT_ATTR" style="display: none" @change="onFileInputChange" />

      <textarea
        ref="textareaRef"
        v-model="input"
        class="chat-input__textarea"
        placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
        rows="1"
        :disabled="loading"
        @keydown="handleKeydown"
        @input="autoResize"
      />

      <div class="chat-input__actions">
        <button v-if="loading" class="btn btn--stop" title="停止生成" @click="emit('stop')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
        <button v-else class="btn btn--send" :disabled="!input.trim() && attachedFiles.length === 0" title="发送" @click="handleSend">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 拖放提示层 -->
    <div v-if="isDragging" class="drag-overlay">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" />
      </svg>
      <span>松开以添加文件</span>
    </div>

    <p class="chat-input__hint">AI 生成内容可能存在错误，请自行甄别</p>
  </div>
</template>

<style scoped>
.chat-input {
  padding: 12px 16px 8px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  position: relative;
}

.chat-input--dragging .chat-input__inner {
  border-color: var(--color-primary);
  background: var(--color-primary-light, rgba(16, 163, 127, 0.06));
}

.file-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.file-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 5px 6px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  max-width: 200px;
}

.file-chip__thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.file-chip__icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 163, 127, 0.1);
  border-radius: 4px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.file-chip__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.file-chip__name {
  font-size: 12px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.file-chip__size {
  font-size: 10px;
  color: var(--color-text-muted);
}

.file-chip__remove {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-muted);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.file-chip__remove:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.file-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  font-size: 12px;
  color: #dc2626;
}

.file-error button {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: #dc2626;
  font-size: 12px;
}

.chat-input__inner {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  padding: 8px 12px;
  background: var(--color-surface-2);
  transition: border-color 0.2s;
}

.chat-input__inner:focus-within {
  border-color: var(--color-primary);
}

.upload-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-muted);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.upload-btn:hover:not(:disabled) {
  background: var(--color-surface);
  color: var(--color-primary);
}

.upload-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-input__textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.6;
  font-family: inherit;
  min-height: 24px;
  max-height: 200px;
  padding: 4px 0;
  vertical-align: middle;
}

.chat-input__textarea::placeholder {
  color: var(--color-text-muted);
}

.chat-input__actions {
  flex-shrink: 0;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.btn--send {
  background: var(--color-primary);
  color: #fff;
}

.btn--send:disabled {
  background: var(--color-border);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.btn--send:not(:disabled):hover {
  background: var(--color-primary-hover, #0d9268);
}

.btn--stop {
  background: #ef4444;
  color: #fff;
}

.btn--stop:hover {
  background: #dc2626;
}

.drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(16, 163, 127, 0.08);
  border: 2px dashed var(--color-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  pointer-events: none;
  z-index: 10;
}

.chat-input__hint {
  text-align: center;
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 6px 0 0;
}
</style>
