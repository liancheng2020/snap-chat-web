import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { streamText, type CoreMessage } from 'ai'
import {
  getAIProviderConfig,
  getAIProviderSummaries,
  getDefaultProviderId,
  isAIProviderId
} from './_aiProviders'

export const config = {
  runtime: 'edge' // 使用 Edge Runtime，支持流式响应
}

// Edge Runtime 使用 Request/Response 原生 Web API
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        providers: getAIProviderSummaries(),
        defaultProvider: getDefaultProviderId()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let messages: CoreMessage[]
  let providerId = getDefaultProviderId()
  try {
    const body = (await req.json()) as { messages: CoreMessage[]; provider?: unknown }
    messages = body.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages 格式错误')
    }
    if (body.provider !== undefined && !isAIProviderId(body.provider)) {
      return new Response(JSON.stringify({ error: '不支持的 AI Provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    providerId = body.provider ?? providerId
  } catch {
    return new Response(JSON.stringify({ error: '请求体格式错误' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const providerConfig = getAIProviderConfig(providerId)
  if (!providerConfig.apiKey) {
    return new Response(JSON.stringify({ error: `${providerConfig.name} API Key 未配置` }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const provider = createOpenAICompatible({
    name: providerConfig.id,
    baseURL: providerConfig.baseURL,
    apiKey: providerConfig.apiKey,
    headers: providerConfig.headers
  })

  try {
    const result = streamText({
      model: provider(providerConfig.modelId),
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
