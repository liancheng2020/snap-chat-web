<script setup lang="ts">
import { ref, nextTick } from 'vue'

const props = defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  stop: []
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

async function handleSend() {
  const content = input.value.trim()
  if (!content || props.loading) return
  input.value = ''
  await nextTick()
  autoResize()
  emit('send', content)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="chat-input">
    <div class="chat-input__inner">
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
        <button v-else class="btn btn--send" :disabled="!input.trim()" title="发送" @click="handleSend">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
    <p class="chat-input__hint">AI 生成内容可能存在错误，请自行甄别</p>
  </div>
</template>

<style scoped>
.chat-input {
  padding: 12px 16px 8px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.chat-input__inner {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--color-surface-2);
  transition: border-color 0.2s;
}

.chat-input__inner:focus-within {
  border-color: var(--color-primary);
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
  background: var(--color-primary-hover);
}

.btn--stop {
  background: #ef4444;
  color: #fff;
}

.btn--stop:hover {
  background: #dc2626;
}

.chat-input__hint {
  text-align: center;
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 6px 0 0;
}
</style>
