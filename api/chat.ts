import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, type CoreMessage } from 'ai'

export const config = {
  runtime: 'edge' // 使用 Edge Runtime，支持流式响应
}

// Edge Runtime 使用 Request/Response 原生 Web API
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const modelId = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API Key 未配置' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let messages: CoreMessage[]
  try {
    const body = (await req.json()) as { messages: CoreMessage[] }
    messages = body.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages 格式错误')
    }
  } catch {
    return new Response(JSON.stringify({ error: '请求体格式错误' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const deepseek = createOpenAICompatible({
    name: 'deepseek',
    baseURL,
    apiKey
  })

  try {
    const result = streamText({
      model: deepseek(modelId),
      messages
    })

    // 返回 Vercel AI SDK 的标准流式响应
    return result.toDataStreamResponse()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '请求失败'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
