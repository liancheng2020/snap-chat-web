export type AIProviderId = 'deepseek' | 'orcarouter'

export interface AIProviderConfig {
  id: AIProviderId
  name: string
  apiKey: string | undefined
  baseURL: string
  modelId: string
  headers?: Record<string, string>
}

export interface AIProviderSummary {
  id: AIProviderId
  name: string
  model: string
  configured: boolean
}

const DEFAULT_ORCAROUTER_APP_URL = 'https://github.com/liancheng2020/snap-chat-web'
const DEFAULT_ORCAROUTER_APP_NAME = 'SnapChat Web'

export function isAIProviderId(value: unknown): value is AIProviderId {
  return value === 'deepseek' || value === 'orcarouter'
}

export function getDefaultProviderId(): AIProviderId {
  return isAIProviderId(process.env.DEFAULT_AI_PROVIDER) ? process.env.DEFAULT_AI_PROVIDER : 'deepseek'
}

export function getAIProviderConfig(id: AIProviderId): AIProviderConfig {
  if (id === 'orcarouter') {
    return {
      id,
      name: 'OrcaRouter',
      apiKey: process.env.ORCAROUTER_API_KEY,
      baseURL: process.env.ORCAROUTER_BASE_URL || 'https://api.orcarouter.ai/v1',
      modelId: process.env.ORCAROUTER_MODEL || 'orcarouter/auto',
      headers: {
        'HTTP-Referer': process.env.ORCAROUTER_APP_URL || DEFAULT_ORCAROUTER_APP_URL,
        'X-Title': process.env.ORCAROUTER_APP_NAME || DEFAULT_ORCAROUTER_APP_NAME
      }
    }
  }

  return {
    id,
    name: 'DeepSeek',
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    modelId: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  }
}

export function getAIProviderSummaries(): AIProviderSummary[] {
  return (['deepseek', 'orcarouter'] satisfies AIProviderId[]).map((id) => {
    const provider = getAIProviderConfig(id)
    return {
      id: provider.id,
      name: provider.name,
      model: provider.modelId,
      configured: Boolean(provider.apiKey)
    }
  })
}
