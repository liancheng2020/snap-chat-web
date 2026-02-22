import { ref } from 'vue'
import type { Message } from '@/types'

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortController.signal
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `请求失败 (${res.status})`)
      }

      // 解析 Vercel AI SDK data stream 格式
      // 每行格式: `0:"text chunk"\n` (文本) 或 `d:{...}\n` (结束)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          // 文本块: `0:"..."`
          const textMatch = line.match(/^0:(.+)$/)
          if (textMatch) {
            try {
              const chunk = JSON.parse(textMatch[1]) as string
              fullText += chunk
              onChunk(fullText)
            } catch {
              // 忽略解析错误
            }
          }
        }
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
