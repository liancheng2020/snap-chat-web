import { config } from 'dotenv'
config({ path: '.env.local' })
import express from 'express'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, type CoreMessage } from 'ai'

const app = express()
app.use(express.json({ limit: '20mb' }))

const PORT = 3000

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const modelId = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey) {
    res.status(500).json({ error: 'API Key 未配置' })
    return
  }

  const messages = req.body.messages as CoreMessage[]
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages 格式错误' })
    return
  }

  const deepseek = createOpenAICompatible({ name: 'deepseek', baseURL, apiKey })

  try {
    let apiError: string | null = null

    const result = streamText({
      model: deepseek(modelId),
      messages,
      onError: ({ error }) => {
        apiError = error instanceof Error ? error.message : String(error)
      }
    })

    // 直接透传流，让客户端解析 3: 错误行
    const response = result.toDataStreamResponse()
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Accel-Buffering', 'no')

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      // 检测流中的 3: 错误行，替换为真实错误信息
      if (apiError) {
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        const out =
          lines
            .map((line) => {
              if (line.match(/^3:/)) {
                return `3:${JSON.stringify(apiError)}`
              }
              return line
            })
            .join('\n') + '\n'
        res.write(out)
      } else {
        res.write(value)
      }
    }
    res.end()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '请求失败'
    if (!res.headersSent) {
      res.status(500).json({ error: message })
    }
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Dev API server running at http://localhost:${PORT}`)
})
