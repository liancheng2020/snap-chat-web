<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { useChat } from '@/composables/useChat'
import ChatMessage from '@/components/ChatMessage.vue'
import ChatInput from '@/components/ChatInput.vue'
import ChatSidebar from '@/components/ChatSidebar.vue'
import type { Message, AttachedFile } from '@/types'

const store = useChatStore()
const { conversations, activeId, activeConversation } = storeToRefs(store)

// 移动端默认收起侧边栏
const isMobile = () => window.innerWidth <= 640
const sidebarCollapsed = ref(isMobile())
const messagesRef = ref<HTMLElement | null>(null)
const toast = ref<{ msg: string; type: 'success' | 'error' } | null>(null)
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

// 页面加载 / 切换对话时，滚动到底部
watch(activeId, () => nextTick(scrollToBottom), { immediate: true })

async function handleSend(content: string, files: AttachedFile[] = []) {
  if (!activeId.value) return

  try {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      files: files.length > 0 ? files : undefined,
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

    // 请求失败时，把错误写入 assistant 消息气泡
    if (error.value) {
      store.updateLastAssistantMessage(activeId.value!, `__ERROR__:${error.value}`)
      streamingMsgId.value = null
      streamingContent.value = ''
    }
  } catch (e) {
    console.error('handleSend 异常:', e)
    if (streamingMsgId.value) {
      store.updateLastAssistantMessage(activeId.value!, `__ERROR__:发送失败，请重试`)
      streamingMsgId.value = null
      streamingContent.value = ''
    }
  }
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

  if (error.value) {
    store.updateLastAssistantMessage(activeId.value!, `__ERROR__:${error.value}`)
    streamingMsgId.value = null
    streamingContent.value = ''
  }
}

function handleCopy(content: string) {
  navigator.clipboard.writeText(content).then(() => {
    showToast('已复制到剪贴板', 'success')
  })
}

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.value = { msg, type }
  setTimeout(() => {
    toast.value = null
  }, 3000)
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
      @select="
        (id) => {
          store.setActive(id)
          if (isMobile()) sidebarCollapsed = true
        }
      "
      @create="
        () => {
          store.createConversation()
          if (isMobile()) sidebarCollapsed = true
        }
      "
      @rename="store.renameConversation"
      @delete="store.deleteConversation"
      @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
    />

    <!-- 主内容区 -->
    <div class="chat-main">
      <!-- 顶栏 -->
      <header class="chat-header">
        <!-- 移动端菜单按钮（侧边栏收起时显示） -->
        <button v-if="sidebarCollapsed" class="icon-btn mobile-menu-btn" title="打开菜单" @click="sidebarCollapsed = false">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
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
              <!-- 外层光晕圆（中心 cx=44, cy=44） -->
              <circle cx="44" cy="44" r="40" fill="url(#glowGrad)" />
              <!-- 气泡主体（x=15, y=24, width=58, height=40 → 中心 x=44, y=44，与光晕圆心完全对齐） -->
              <rect x="15" y="24" width="58" height="40" rx="16" fill="url(#bubbleGrad)" filter="url(#glow)" />
              <!-- 高光层 -->
              <rect x="15" y="24" width="58" height="18" rx="16" fill="white" opacity="0.12" />
              <!-- 气泡尾（圆润三角） -->
              <path d="M27 63 C25 70 21 76 33 72 L31 63Z" fill="url(#bubbleGrad)" />
              <!-- 三个点（气泡中心 x=44, y=44，间距14px） -->
              <circle cx="30" cy="44" r="4.5" fill="white" opacity="0.92" />
              <circle cx="44" cy="44" r="4.5" fill="white" opacity="0.92" />
              <circle cx="58" cy="44" r="4.5" fill="white" opacity="0.92" />
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

      <!-- 输入框 -->
      <ChatInput :loading="isLoading" @send="handleSend" @stop="stop" />
    </div>

    <!-- Toast 提示 -->
    <transition name="toast">
      <div v-if="toast" class="toast" :class="`toast--${toast.type}`">{{ toast.msg }}</div>
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
  display: flex;
  flex-direction: column;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--color-text-muted);
  text-align: center;
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
  padding: 9px 20px;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  pointer-events: none;
  z-index: 999;
  max-width: 80vw;
  text-align: center;
  line-height: 1.5;
}

.toast--error {
  background: #dc2626;
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

/* ===== 移动端 ===== */
.mobile-menu-btn {
  display: none;
  flex-shrink: 0;
  margin-right: 4px;
}

@media (max-width: 640px) {
  .mobile-menu-btn {
    display: flex;
  }

  .chat-header {
    padding: 0 12px;
    gap: 4px;
  }

  .chat-header__title {
    flex: 1;
  }
}
</style>
