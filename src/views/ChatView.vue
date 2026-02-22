<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { useChat } from '@/composables/useChat'
import ChatMessage from '@/components/ChatMessage.vue'
import ChatInput from '@/components/ChatInput.vue'
import ChatSidebar from '@/components/ChatSidebar.vue'
import type { Message } from '@/types'

const store = useChatStore()
const { conversations, activeId, activeConversation } = storeToRefs(store)

const sidebarCollapsed = ref(false)
const messagesRef = ref<HTMLElement | null>(null)
const toast = ref<string | null>(null)
const streamingContent = ref('')
const streamingMsgId = ref<string | null>(null)

const { isLoading, error, sendMessage, stop } = useChat(() => activeId.value)

// 当前展示的消息（含正在流式输出的内容）
const displayMessages = computed<Message[]>(() => {
  const msgs = activeConversation.value?.messages ?? []
  if (!streamingMsgId.value) return msgs
  return msgs.map((m) => (m.id === streamingMsgId.value ? { ...m, content: streamingContent.value } : m))
})

// 滚动到底部
async function scrollToBottom() {
  await nextTick()
  const el = messagesRef.value
  if (el) el.scrollTop = el.scrollHeight
}

watch(() => displayMessages.value.length, scrollToBottom)
watch(streamingContent, scrollToBottom)

async function handleSend(content: string) {
  if (!activeId.value) return

  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content,
    createdAt: new Date()
  }
  store.addMessage(activeId.value, userMsg)

  const assistantMsgId = crypto.randomUUID()
  const assistantMsg: Message = {
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    createdAt: new Date()
  }
  store.addMessage(activeId.value, assistantMsg)
  streamingMsgId.value = assistantMsgId
  streamingContent.value = ''

  const historyMessages = activeConversation.value!.messages.slice(0, -1) // 不含空白 assistant

  await sendMessage(
    historyMessages,
    (text) => {
      streamingContent.value = text
    },
    (fullText) => {
      store.updateLastAssistantMessage(activeId.value!, fullText)
      streamingMsgId.value = null
      streamingContent.value = ''
    }
  )
}

async function handleRegenerate() {
  if (!activeId.value || !activeConversation.value) return
  const msgs = activeConversation.value.messages
  // 移除最后一条 assistant 消息
  const lastIdx = msgs.length - 1
  if (msgs[lastIdx]?.role !== 'assistant') return
  msgs.splice(lastIdx, 1)

  const assistantMsgId = crypto.randomUUID()
  store.addMessage(activeId.value, {
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    createdAt: new Date()
  })
  streamingMsgId.value = assistantMsgId
  streamingContent.value = ''

  await sendMessage(
    msgs,
    (text) => {
      streamingContent.value = text
    },
    (fullText) => {
      store.updateLastAssistantMessage(activeId.value!, fullText)
      streamingMsgId.value = null
    }
  )
}

function handleCopy(content: string) {
  navigator.clipboard.writeText(content).then(() => {
    showToast('已复制到剪贴板')
  })
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => {
    toast.value = null
  }, 2000)
}

// 主题切换
const isDark = ref(document.documentElement.classList.contains('dark'))
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
</script>

<template>
  <div class="chat-view">
    <!-- 侧边栏 -->
    <ChatSidebar
      :conversations="conversations"
      :active-id="activeId"
      :collapsed="sidebarCollapsed"
      @select="store.setActive"
      @create="store.createConversation"
      @rename="store.renameConversation"
      @delete="store.deleteConversation"
      @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
    />

    <!-- 主内容区 -->
    <div class="chat-main">
      <!-- 顶栏 -->
      <header class="chat-header">
        <h1 class="chat-header__title">
          {{ activeConversation?.title || '新对话' }}
        </h1>
        <div class="chat-header__actions">
          <!-- 主题切换 -->
          <button class="icon-btn" :title="isDark ? '切换浅色模式' : '切换深色模式'" @click="toggleTheme">
            <svg
              v-if="isDark"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </header>

      <!-- 消息列表 -->
      <div ref="messagesRef" class="chat-messages">
        <!-- 空状态 -->
        <div v-if="displayMessages.length === 0" class="chat-empty">
          <div class="chat-empty__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88" fill="none">
              <defs>
                <linearGradient id="bubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#10a37f" />
                  <stop offset="100%" stop-color="#38bdf8" />
                </linearGradient>
                <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#10a37f" stop-opacity="0.2" />
                  <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.05" />
                </linearGradient>
                <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <!-- 外层光晕圆 -->
              <circle cx="44" cy="44" r="40" fill="url(#glowGrad)" />
              <!-- 气泡主体 -->
              <rect x="10" y="18" width="58" height="40" rx="16" fill="url(#bubbleGrad)" filter="url(#glow)" />
              <!-- 高光层 -->
              <rect x="10" y="18" width="58" height="18" rx="16" fill="white" opacity="0.12" />
              <!-- 气泡尾（圆润三角） -->
              <path d="M22 57 C20 64 16 70 28 66 L26 57Z" fill="url(#bubbleGrad)" />
              <!-- 三个点（带弹跳动画占位） -->
              <circle cx="30" cy="38" r="4.5" fill="white" opacity="0.92" />
              <circle cx="44" cy="38" r="4.5" fill="white" opacity="0.92" />
              <circle cx="58" cy="38" r="4.5" fill="white" opacity="0.92" />
            </svg>
          </div>
          <h2>开始一段新对话</h2>
          <p>向 AI 提问，获取实时流式回复</p>
        </div>

        <ChatMessage
          v-for="msg in displayMessages"
          :key="msg.id"
          :message="msg"
          :is-streaming="msg.id === streamingMsgId"
          @copy="handleCopy"
          @regenerate="handleRegenerate"
        />

        <!-- 加载提示 -->
        <div v-if="isLoading && !streamingMsgId" class="loading-dots"><span /><span /><span /></div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-bar">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {{ error }}
        <button @click="error = null">✕</button>
      </div>

      <!-- 输入框 -->
      <ChatInput :loading="isLoading" @send="handleSend" @stop="stop" />
    </div>

    <!-- Toast 提示 -->
    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--color-surface);
}

.chat-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface);
}

.chat-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-header__actions {
  display: flex;
  gap: 8px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  scroll-behavior: smooth;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: var(--color-text-muted);
}

.chat-empty__icon {
  margin-bottom: 20px;
  animation: float 3.5s ease-in-out infinite;
  filter: drop-shadow(0 8px 24px rgba(16, 163, 127, 0.25));
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(-1deg);
  }
  50% {
    transform: translateY(-10px) rotate(1deg);
  }
}

.chat-empty h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.chat-empty p {
  font-size: 14px;
}

.loading-dots {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: bounce 1.2s ease infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 8px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  font-size: 13px;
  color: #dc2626;
}

.error-bar button {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: #dc2626;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  pointer-events: none;
  z-index: 999;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
