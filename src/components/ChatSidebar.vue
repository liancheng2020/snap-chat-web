<script setup lang="ts">
import { ref } from 'vue'
import type { Conversation } from '@/types'

const props = defineProps<{
  conversations: Conversation[]
  activeId: string | null
  collapsed: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  create: []
  rename: [id: string, title: string]
  delete: [id: string]
  toggleCollapse: []
}>()

const editingId = ref<string | null>(null)
const editingTitle = ref('')

function startRename(conv: Conversation) {
  editingId.value = conv.id
  editingTitle.value = conv.title
}

function confirmRename(id: string) {
  if (editingTitle.value.trim()) {
    emit('rename', id, editingTitle.value.trim())
  }
  editingId.value = null
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return '今天'
  if (diff < 172800000) return '昨天'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <!-- 移动端遮罩层：侧边栏展开时显示，点击关闭 -->
  <div v-if="!collapsed" class="sidebar-overlay" @click="emit('toggleCollapse')" />

  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <!-- 顶部 -->
    <div class="sidebar__header">
      <button class="icon-btn toggle-btn" :title="collapsed ? '展开侧栏' : '收起侧栏'" @click="emit('toggleCollapse')">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <transition name="fade">
        <button v-if="!collapsed" class="new-chat-btn" @click="emit('create')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新对话
        </button>
      </transition>
    </div>

    <!-- 对话列表 -->
    <transition name="fade">
      <nav v-if="!collapsed" class="sidebar__list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conv-item"
          :class="{ 'conv-item--active': conv.id === activeId }"
          @click="emit('select', conv.id)"
        >
          <div class="conv-item__main">
            <!-- 重命名输入框 -->
            <input
              v-if="editingId === conv.id"
              v-model="editingTitle"
              class="conv-item__input"
              @blur="confirmRename(conv.id)"
              @keydown.enter="confirmRename(conv.id)"
              @keydown.esc="editingId = null"
              @click.stop
              autofocus
            />
            <span v-else class="conv-item__title">{{ conv.title }}</span>
            <span class="conv-item__date">{{ formatDate(conv.updatedAt) }}</span>
          </div>
          <!-- 操作按钮（hover 显示） -->
          <div class="conv-item__actions" @click.stop>
            <button class="icon-btn" title="重命名" @click="startRename(conv)">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="icon-btn icon-btn--danger" title="删除" @click="emit('delete', conv.id)">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6m4-6v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="conversations.length === 0" class="sidebar__empty">暂无对话记录</div>
      </nav>
    </transition>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 260px;
  height: 100%;
  background: var(--color-sidebar);
  border-right: 1px solid var(--color-border);
  flex-shrink: 0;
  transition: width 0.25s ease;
  overflow: hidden;
}

.sidebar--collapsed {
  width: 52px;
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 10px;
  gap: 8px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.toggle-btn {
  flex-shrink: 0;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.new-chat-btn:hover {
  background: var(--color-surface-2);
}

.sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 6px;
}

.conv-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  gap: 4px;
  min-width: 0;
}

.conv-item:hover {
  background: var(--color-surface-2);
}

.conv-item--active {
  background: var(--color-primary-light);
}

.conv-item__main {
  flex: 1;
  min-width: 0;
}

.conv-item__title {
  display: block;
  font-size: 13px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-item__date {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.conv-item__input {
  width: 100%;
  font-size: 13px;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  padding: 2px 6px;
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
}

.conv-item__actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.conv-item:hover .conv-item__actions,
.conv-item--active .conv-item__actions {
  opacity: 1;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.icon-btn--danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

.sidebar__empty {
  text-align: center;
  padding: 24px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== 移动端遮罩 ===== */
.sidebar-overlay {
  display: none;
}

@media (max-width: 640px) {
  /* 遮罩层：覆盖整个屏幕 */
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 99;
  }

  /* 侧边栏：浮动在内容上方 */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 100;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
    transition:
      transform 0.25s ease,
      width 0.25s ease;
  }

  /* 收起时：完全滑出屏幕左侧，宽度归零 */
  .sidebar--collapsed {
    width: 260px;
    transform: translateX(-100%);
  }
}
</style>
