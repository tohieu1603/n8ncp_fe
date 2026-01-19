'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Dropdown,
  Typography,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FontSizeOutlined,
  AlignLeftOutlined,
  PictureOutlined,
  CodeOutlined,
  MessageOutlined,
  UnorderedListOutlined,
  MinusOutlined,
  HolderOutlined,
} from '@ant-design/icons'
import type { BlockContent } from '@/lib/api'

const { TextArea } = Input
const { Text } = Typography

interface BlockEditorProps {
  blocks: BlockContent[]
  onChange: (blocks: BlockContent[]) => void
}

const blockTypes = [
  { key: 'text', label: 'Text', icon: <AlignLeftOutlined /> },
  { key: 'heading', label: 'Heading', icon: <FontSizeOutlined /> },
  { key: 'image', label: 'Image', icon: <PictureOutlined /> },
  { key: 'code', label: 'Code', icon: <CodeOutlined /> },
  { key: 'quote', label: 'Quote', icon: <MessageOutlined /> },
  { key: 'list', label: 'List', icon: <UnorderedListOutlined /> },
  { key: 'divider', label: 'Divider', icon: <MinusOutlined /> },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export default function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const addBlock = (type: BlockContent['type']) => {
    const newBlock: BlockContent = {
      id: generateId(),
      type,
      data: getDefaultData(type),
    }
    onChange([...blocks, newBlock])
  }

  const getDefaultData = (type: BlockContent['type']): Record<string, unknown> => {
    switch (type) {
      case 'heading':
        return { text: '', level: 2 }
      case 'text':
        return { text: '' }
      case 'image':
        return { url: '', caption: '', alt: '' }
      case 'code':
        return { code: '', language: 'javascript' }
      case 'quote':
        return { text: '', author: '' }
      case 'list':
        return { items: [''], style: 'unordered' }
      case 'divider':
        return {}
      default:
        return {}
    }
  }

  const updateBlock = (id: string, data: Record<string, unknown>) => {
    onChange(
      blocks.map((block) =>
        block.id === id ? { ...block, data: { ...block.data, ...data } } : block
      )
    )
  }

  const deleteBlock = (id: string) => {
    onChange(blocks.filter((block) => block.id !== id))
  }

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === id)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return
    }

    const newBlocks = [...blocks]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newBlocks[index], newBlocks[targetIndex]] = [
      newBlocks[targetIndex],
      newBlocks[index],
    ]
    onChange(newBlocks)
  }

  const renderBlockContent = (block: BlockContent) => {
    switch (block.type) {
      case 'heading':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              value={block.data.level as number}
              onChange={(level) => updateBlock(block.id, { level })}
              options={[
                { value: 1, label: 'H1' },
                { value: 2, label: 'H2' },
                { value: 3, label: 'H3' },
                { value: 4, label: 'H4' },
              ]}
              style={{ width: 80 }}
            />
            <Input
              value={block.data.text as string}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              placeholder="Heading text"
              style={{
                fontSize: block.data.level === 1 ? 28 : block.data.level === 2 ? 24 : 20,
                fontWeight: 600,
              }}
            />
          </Space>
        )

      case 'text':
        return (
          <TextArea
            value={block.data.text as string}
            onChange={(e) => updateBlock(block.id, { text: e.target.value })}
            placeholder="Write your text here..."
            autoSize={{ minRows: 2, maxRows: 10 }}
          />
        )

      case 'image':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              value={block.data.url as string}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              placeholder="Image URL"
              prefix={<PictureOutlined />}
            />
            {block.data.url ? (
              <img
                src={block.data.url as string}
                alt={block.data.alt as string}
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
              />
            ) : null}
            <Input
              value={block.data.caption as string}
              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
              placeholder="Caption (optional)"
            />
            <Input
              value={block.data.alt as string}
              onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
              placeholder="Alt text (for accessibility)"
            />
          </Space>
        )

      case 'code':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              value={block.data.language as string}
              onChange={(language) => updateBlock(block.id, { language })}
              options={[
                { value: 'javascript', label: 'JavaScript' },
                { value: 'typescript', label: 'TypeScript' },
                { value: 'python', label: 'Python' },
                { value: 'html', label: 'HTML' },
                { value: 'css', label: 'CSS' },
                { value: 'json', label: 'JSON' },
                { value: 'bash', label: 'Bash' },
                { value: 'sql', label: 'SQL' },
              ]}
              style={{ width: 150 }}
            />
            <TextArea
              value={block.data.code as string}
              onChange={(e) => updateBlock(block.id, { code: e.target.value })}
              placeholder="// Your code here"
              style={{ fontFamily: 'monospace' }}
              autoSize={{ minRows: 3, maxRows: 20 }}
            />
          </Space>
        )

      case 'quote':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <TextArea
              value={block.data.text as string}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              placeholder="Quote text"
              autoSize={{ minRows: 2, maxRows: 5 }}
              style={{ fontStyle: 'italic', borderLeft: '3px solid #8b5cf6', paddingLeft: 12 }}
            />
            <Input
              value={block.data.author as string}
              onChange={(e) => updateBlock(block.id, { author: e.target.value })}
              placeholder="— Author name"
              style={{ width: 200 }}
            />
          </Space>
        )

      case 'list':
        const items = (block.data.items as string[]) || ['']
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              value={block.data.style as string}
              onChange={(style) => updateBlock(block.id, { style })}
              options={[
                { value: 'unordered', label: 'Bullet List' },
                { value: 'ordered', label: 'Numbered List' },
              ]}
              style={{ width: 150 }}
            />
            {items.map((item, index) => (
              <Space key={index} style={{ width: '100%' }}>
                <span style={{ color: '#a0a0a8', width: 20 }}>
                  {block.data.style === 'ordered' ? `${index + 1}.` : '•'}
                </span>
                <Input
                  value={item}
                  onChange={(e) => {
                    const newItems = [...items]
                    newItems[index] = e.target.value
                    updateBlock(block.id, { items: newItems })
                  }}
                  placeholder="List item"
                  style={{ flex: 1 }}
                />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const newItems = items.filter((_, i) => i !== index)
                    updateBlock(block.id, { items: newItems.length ? newItems : [''] })
                  }}
                />
              </Space>
            ))}
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => updateBlock(block.id, { items: [...items, ''] })}
            >
              Add Item
            </Button>
          </Space>
        )

      case 'divider':
        return <Divider style={{ margin: '8px 0' }} />

      default:
        return <Text type="secondary">Unknown block type</Text>
    }
  }

  return (
    <div>
      {blocks.map((block, index) => (
        <Card
          key={block.id}
          size="small"
          style={{ marginBottom: 12 }}
          extra={
            <Space size={4}>
              <Button
                size="small"
                type="text"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => moveBlock(block.id, 'up')}
              />
              <Button
                size="small"
                type="text"
                icon={<ArrowDownOutlined />}
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(block.id, 'down')}
              />
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => deleteBlock(block.id)}
              />
            </Space>
          }
          title={
            <Space>
              <HolderOutlined style={{ color: '#6b6b75', cursor: 'grab' }} />
              {blockTypes.find((t) => t.key === block.type)?.icon}
              <Text style={{ textTransform: 'capitalize' }}>{block.type}</Text>
            </Space>
          }
        >
          {renderBlockContent(block)}
        </Card>
      ))}

      <Dropdown
        menu={{
          items: blockTypes.map((type) => ({
            key: type.key,
            icon: type.icon,
            label: type.label,
            onClick: () => addBlock(type.key as BlockContent['type']),
          })),
        }}
        trigger={['click']}
      >
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          style={{ width: '100%', height: 48 }}
        >
          Add Block
        </Button>
      </Dropdown>
    </div>
  )
}
