// 类型定义

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}
