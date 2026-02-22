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

    // 构建 API 消息，支持多模态（图片 base64 + 文档文本）
    // 过滤掉错误消息（__ERROR__: 前缀的 assistant 消息不发给 API）
    const apiMessages = messages
      .filter((m) => !(m.role === 'assistant' && m.content.startsWith('__ERROR__:')))
      .filter((m) => !(m.role === 'assistant' && m.content.trim() === ''))
      .map((m) => {
        const images = m.files?.filter((f) => f.type === 'image') ?? []
        const docs = m.files?.filter((f) => f.type === 'document') ?? []

        // 拼接文档内容到文本末尾
        let textContent = m.content
        if (docs.length > 0) {
          const docTexts = docs
            .map((d) => `\n\n[附件：${d.name}]\n${d.data.slice(0, 8000)}${d.data.length > 8000 ? '\n...(内容过长已截断)' : ''}`)
            .join('')
          textContent = textContent + docTexts
        }

        // DeepSeek API 不支持图片输入，将图片文件名附加到文本中作为提示
        if (images.length > 0 && m.role === 'user') {
          const imgNote = images.map((img) => `[图片：${img.name}]`).join(' ')
          textContent = textContent ? `${textContent}\n${imgNote}` : imgNote
        }

        return {
          role: m.role as 'user' | 'assistant',
          content: textContent || (m.role === 'user' ? '你好' : '')
        }
      })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortController.signal
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || `请求失败 (${res.status})`)
      }

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
          // 文本块: 0:"..."
          const textMatch = line.match(/^0:(.+)$/)
          if (textMatch) {
            try {
              const chunk = JSON.parse(textMatch[1]) as string
              fullText += chunk
              onChunk(fullText)
            } catch {
              // 忽略解析错误
            }
            continue
          }
          // 错误块: 3:"..." 或 3:{...}
          const errMatch = line.match(/^3:(.+)$/)
          if (errMatch) {
            try {
              const errVal = JSON.parse(errMatch[1])
              const errMsg = typeof errVal === 'string' ? errVal : ((errVal as { message?: string }).message ?? JSON.stringify(errVal))
              throw new Error(errMsg)
            } catch (parseErr) {
              // 如果 JSON.parse 本身抛出，直接用原始字符串
              if (parseErr instanceof SyntaxError) {
                throw new Error(errMatch[1])
              }
              throw parseErr
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
