import { config } from 'dotenv'
config({ path: '.env.local' })
import express from 'express'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText } from 'ai'

const app = express()
app.use(express.json())

const PORT = 3000

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const modelId = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey) {
    res.status(500).json({ error: 'API Key 未配置' })
    return
  }

  const { messages } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages 格式错误' })
    return
  }

  const deepseek = createOpenAICompatible({ name: 'deepseek', baseURL, apiKey })

  try {
    const result = streamText({
      model: deepseek(modelId),
      messages
    })

    // 将 Vercel AI SDK 的 data stream 转发给前端
    const response = result.toDataStreamResponse()
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Accel-Buffering', 'no')

    const reader = response.body!.getReader()
    const flush = async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
      res.end()
    }
    await flush()
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
