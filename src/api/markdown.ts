import { Marked } from 'marked'
import hljs from 'highlight.js'
import { markedHighlight } from 'marked-highlight'

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  })
)

marked.setOptions({
  gfm: true,
  breaks: true
})

export function renderMarkdown(content: string): string {
  return marked.parse(content) as string
}
