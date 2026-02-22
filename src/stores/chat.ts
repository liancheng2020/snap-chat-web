import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Conversation, Message } from '@/types'

const STORAGE_KEY = 'snap-chat-conversations'

function loadFromStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as Conversation[]
    return data.map((c) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      messages: c.messages.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }))
    }))
  } catch {
    return []
  }
}

function saveToStorage(conversations: Conversation[]) {
  // 存储时剥离文件的 data/previewUrl（base64/文本内容），避免超出 localStorage 配额
  // 历史记录只需保留文件名、大小等元信息用于展示
  const stripped = conversations.map((c) => ({
    ...c,
    messages: c.messages.map((m) => ({
      ...m,
      files: m.files?.map(({ data: _data, previewUrl: _previewUrl, ...meta }) => ({
        ...meta,
        data: '',
        previewUrl: undefined
      }))
    }))
  }))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
  } catch (e) {
    // 仍然超限时（极端情况），裁剪旧对话消息后重试
    console.warn('localStorage 存储超限，尝试裁剪历史记录', e)
    const trimmed = stripped.map((c, i) => ({
      ...c,
      // 只保留最新的对话完整，其余对话只保留最近 10 条消息
      messages: i === 0 ? c.messages : c.messages.slice(-10)
    }))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      // 最后兜底：只保存对话列表元信息，不保存消息
      const minimal = stripped.map((c) => ({ ...c, messages: [] }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal))
    }
  }
}

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>(loadFromStorage())
  const activeId = ref<string | null>(conversations.value[0]?.id ?? null)

  const activeConversation = computed(() => conversations.value.find((c) => c.id === activeId.value) ?? null)

  function createConversation(): Conversation {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title: '新对话',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    conversations.value.unshift(conv)
    activeId.value = conv.id
    saveToStorage(conversations.value)
    return conv
  }

  function setActive(id: string) {
    activeId.value = id
  }

  function renameConversation(id: string, title: string) {
    const conv = conversations.value.find((c) => c.id === id)
    if (conv) {
      conv.title = title
      saveToStorage(conversations.value)
    }
  }

  function deleteConversation(id: string) {
    const idx = conversations.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      conversations.value.splice(idx, 1)
      if (activeId.value === id) {
        activeId.value = conversations.value[0]?.id ?? null
      }
      saveToStorage(conversations.value)
    }
  }

  function addMessage(convId: string, msg: Message) {
    const conv = conversations.value.find((c) => c.id === convId)
    if (!conv) return
    conv.messages.push(msg)
    conv.updatedAt = new Date()
    // 自动命名：取用户第一条消息前20字
    if (conv.title === '新对话' && msg.role === 'user') {
      conv.title = msg.content.slice(0, 20) || '新对话'
    }
    saveToStorage(conversations.value)
  }

  function updateLastAssistantMessage(convId: string, content: string) {
    const conv = conversations.value.find((c) => c.id === convId)
    if (!conv) return
    const msgs = conv.messages
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') {
        msgs[i].content = content
        break
      }
    }
    saveToStorage(conversations.value)
  }

  function clearMessages(convId: string) {
    const conv = conversations.value.find((c) => c.id === convId)
    if (conv) {
      conv.messages = []
      saveToStorage(conversations.value)
    }
  }

  // 初始化：如果没有会话则自动创建一个
  if (conversations.value.length === 0) {
    createConversation()
  }

  return {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    setActive,
    renameConversation,
    deleteConversation,
    addMessage,
    updateLastAssistantMessage,
    clearMessages
  }
})
