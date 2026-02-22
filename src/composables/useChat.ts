import { ref } from 'vue'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText } from 'ai'
import type { Message } from '@/types'

const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY as string
const baseURL = (import.meta.env.VITE_DEEPSEEK_BASE_URL as string) || 'https://api.deepseek.com/v1'
const modelId = (import.meta.env.VITE_DEEPSEEK_MODEL as string) || 'deepseek-chat'

const deepseek = createOpenAICompatible({
  name: 'deepseek',
  baseURL,
  apiKey
})

export function useChat(convId: () => string | null) {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let abortController: AbortController | null = null

  async function sendMessage(messages: Message[], onChunk: (text: string) => void, onDone: (fullText: string) => void) {
    if (isLoading.value) return
    isLoading.value = true
    error.value = null
    abortController = new AbortController()

    const apiMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

    try {
      const result = streamText({
        model: deepseek(modelId),
        messages: apiMessages,
        abortSignal: abortController.signal
      })

      let fullText = ''
      for await (const chunk of result.textStream) {
        fullText += chunk
        onChunk(fullText)
      }
      onDone(fullText)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        // 用户手动停止，不报错
      } else {
        error.value = e instanceof Error ? e.message : '请求失败，请稍后重试'
      }
    } finally {
      isLoading.value = false
      abortController = null
    }
  }

  function stop() {
    abortController?.abort()
    isLoading.value = false
  }

  return { isLoading, error, sendMessage, stop, convId }
}
