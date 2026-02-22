// 类型定义

export interface AttachedFile {
  id: string
  name: string
  type: 'image' | 'document'
  mimeType: string
  size: number
  // 图片：base64 data URL；文档：提取的文本内容
  data: string
  // 图片预览用
  previewUrl?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: AttachedFile[]
  createdAt: Date
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}
