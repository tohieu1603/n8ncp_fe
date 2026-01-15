'use client'

import { useState } from 'react'
import { Copy, Check, MessageSquare, Image, ChevronDown, ChevronRight, Cpu, Crown } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface CodeExample {
  title: string
  getCode: (baseUrl: string) => string
}

interface ApiSection {
  id: string
  title: string
  icon: typeof MessageSquare
  description: string
  endpoint: string
  method: string
  examples: CodeExample[]
}

const API_SECTIONS: ApiSection[] = [
  {
    id: 'chat',
    title: 'Chat Completions',
    icon: MessageSquare,
    description: 'Send messages to AI models and receive responses. Supports streaming, multimodal input (text + images), structured output, and specialized agents.',
    endpoint: '/v1/chat/completions',
    method: 'POST',
    examples: [
      {
        title: 'Basic Chat',
        getCode: (baseUrl) => `curl --request POST \\
  --url ${baseUrl}/v1/chat/completions \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '{
  "model": "gemini-3-pro",
  "messages": [
    {"role": "user", "content": "Hello, how are you?"}
  ]
}'`
      },
      {
        title: 'With Agent (Code Assistant)',
        getCode: (baseUrl) => `curl --request POST \\
  --url ${baseUrl}/v1/chat/completions \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '{
  "model": "gemini-3-pro",
  "agent": "code_base",
  "messages": [
    {"role": "user", "content": "Write a Python function to sort a list"}
  ],
  "stream": true
}'`
      },
      {
        title: 'With Image Input',
        getCode: (baseUrl) => `curl --request POST \\
  --url ${baseUrl}/v1/chat/completions \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '{
  "model": "gemini-3-pro",
  "agent": "image_base",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "https://example.com/image.png"}}
      ]
    }
  ]
}'`
      },
      {
        title: 'With Google Search',
        getCode: (baseUrl) => `curl --request POST \\
  --url ${baseUrl}/v1/chat/completions \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '{
  "model": "gemini-3-pro",
  "messages": [
    {"role": "user", "content": "What are the latest news about AI?"}
  ],
  "tools": [{"type": "function", "function": {"name": "googleSearch"}}],
  "stream": true
}'`
      },
      {
        title: 'Structured Output (JSON)',
        getCode: (baseUrl) => `curl --request POST \\
  --url ${baseUrl}/v1/chat/completions \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '{
  "model": "gemini-3-pro",
  "messages": [
    {"role": "user", "content": "List 3 programming languages with their use cases"}
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "languages",
      "schema": {
        "type": "object",
        "properties": {
          "languages": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "use_case": {"type": "string"}
              }
            }
          }
        }
      }
    }
  }
}'`
      }
    ]
  },
  {
    id: 'image',
    title: 'Image Generation',
    icon: Image,
    description: 'Generate images from text prompts using AI models.',
    endpoint: '/v1/images/generations',
    method: 'POST',
    examples: [
      {
        title: 'Generate Image',
        getCode: (baseUrl) => `curl --request POST \\
  --url ${baseUrl}/v1/images/generations \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '{
  "model": "flux-schnell",
  "prompt": "A beautiful sunset over mountains",
  "size": "1024x1024",
  "n": 1
}'`
      }
    ]
  }
]

// Agents data
const AGENTS = [
  { id: 'general_base', name: 'General Assistant', category: 'general', tier: 'base', desc: 'General-purpose AI assistant' },
  { id: 'general_pro', name: 'General Pro', category: 'general', tier: 'pro', desc: 'Advanced reasoning with extended context' },
  { id: 'image_base', name: 'Image Expert', category: 'image', tier: 'base', desc: 'Image analysis and prompts' },
  { id: 'image_pro', name: 'Image Pro', category: 'image', tier: 'pro', desc: 'Multi-image analysis & professional prompts' },
  { id: 'code_base', name: 'Code Assistant', category: 'code', tier: 'base', desc: 'Coding help and debugging' },
  { id: 'code_pro', name: 'Code Pro', category: 'code', tier: 'pro', desc: 'Architecture & full-stack solutions' },
  { id: 'document_base', name: 'Document Analyst', category: 'document', tier: 'base', desc: 'Document analysis and summaries' },
  { id: 'document_pro', name: 'Document Pro', category: 'document', tier: 'pro', desc: 'Deep analysis & research' },
  { id: 'creative_base', name: 'Creative Writer', category: 'creative', tier: 'base', desc: 'Creative writing assistance' },
  { id: 'creative_pro', name: 'Creative Pro', category: 'creative', tier: 'pro', desc: 'Professional content & brand storytelling' },
]

// Models data
const MODELS = [
  { id: 'gemini-3-pro', provider: 'Google', desc: 'Most capable, multimodal' },
  { id: 'gemini-2.5-pro', provider: 'Google', desc: 'Fast and efficient' },
  { id: 'gpt-4o', provider: 'OpenAI', desc: 'GPT-4 Omni' },
  { id: 'gpt-4o-mini', provider: 'OpenAI', desc: 'Fast and affordable' },
  { id: 'claude-3.5-sonnet', provider: 'Anthropic', desc: 'Balanced performance' },
  { id: 'claude-3.5-haiku', provider: 'Anthropic', desc: 'Fast responses' },
]

export default function DocsPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['chat']))
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">API Documentation</h1>
        <p className="text-[#a0a0a8] mt-1 text-sm">OpenAI-compatible API with specialized AI agents</p>
      </div>

      <div className="space-y-4">
        {/* Quick Start */}
        <div className="p-5 bg-[#111117] rounded-xl border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-semibold text-[#f5f5f5] mb-3">Quick Start</h3>
          <p className="text-sm text-[#a0a0a8] mb-4">All requests require your API key in the Authorization header:</p>
          <pre className="p-4 bg-[#0a0a0f] rounded-lg overflow-x-auto text-sm">
            <code className="text-[#a0a0a8]">Authorization: Bearer YOUR_API_KEY</code>
          </pre>
        </div>

        {/* Base URL */}
        <div className="p-4 bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] rounded-xl">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-[#a0a0a8]">Base URL:</span>
            <code className="px-3 py-1 bg-[#0a0a0f] rounded-lg font-mono text-sm text-[#8b5cf6]">{API_BASE_URL}</code>
            <button
              onClick={() => copyToClipboard(API_BASE_URL, 'baseurl')}
              className="p-1.5 rounded-lg text-[#a0a0a8] hover:text-[#8b5cf6] transition-colors"
            >
              {copiedId === 'baseurl' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* API Sections */}
        {API_SECTIONS.map((section) => {
          const Icon = section.icon
          const isExpanded = expandedSections.has(section.id)

          return (
            <div key={section.id} className="bg-[#111117] rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                <div className="w-9 h-9 flex items-center justify-center bg-[rgba(139,92,246,0.15)] rounded-lg">
                  <Icon size={18} className="text-[#8b5cf6]" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-[#f5f5f5]">{section.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-500/20 text-blue-400">
                      {section.method}
                    </span>
                    <code className="text-xs text-[#6b6b75]">{section.endpoint}</code>
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={18} className="text-[#6b6b75]" /> : <ChevronRight size={18} className="text-[#6b6b75]" />}
              </button>

              {isExpanded && (
                <div className="border-t border-[rgba(255,255,255,0.05)] p-4">
                  <p className="text-sm text-[#a0a0a8] mb-4">{section.description}</p>

                  <div className="space-y-4">
                    {section.examples.map((example, idx) => {
                      const code = example.getCode(API_BASE_URL)
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[#f5f5f5]">{example.title}</span>
                            <button
                              onClick={() => copyToClipboard(code, `${section.id}-${idx}`)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#a0a0a8] hover:text-[#8b5cf6] hover:bg-[rgba(139,92,246,0.1)] transition-colors"
                            >
                              {copiedId === `${section.id}-${idx}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                              Copy
                            </button>
                          </div>
                          <pre className="p-4 bg-[#0a0a0f] rounded-lg overflow-x-auto text-xs">
                            <code className="text-[#a0a0a8] whitespace-pre">{code}</code>
                          </pre>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Agents */}
        <div className="p-5 bg-[#111117] rounded-xl border border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={20} className="text-[#8b5cf6]" />
            <h3 className="text-lg font-semibold text-[#f5f5f5]">Available Agents</h3>
          </div>
          <p className="text-sm text-[#a0a0a8] mb-4">
            Use the <code className="px-1.5 py-0.5 bg-[#0a0a0f] rounded text-[#8b5cf6]">agent</code> parameter to select a specialized AI assistant.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {AGENTS.map(({ id, name, tier, desc }) => (
              <div key={id} className="flex items-center gap-3 p-3 bg-[#0a0a0f] rounded-lg">
                <code className="text-sm text-[#8b5cf6] min-w-[140px]">{id}</code>
                <span className="text-sm text-[#f5f5f5]">{name}</span>
                {tier === 'pro' && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded">
                    <Crown size={10} /> PRO
                  </span>
                )}
                <span className="text-xs text-[#6b6b75] ml-auto hidden sm:block">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Models */}
        <div className="p-5 bg-[#111117] rounded-xl border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4">Available Models</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODELS.map(({ id, provider, desc }) => (
              <div key={id} className="flex items-center gap-3 p-3 bg-[#0a0a0f] rounded-lg">
                <code className="text-sm text-[#8b5cf6]">{id}</code>
                <span className="text-xs text-[#6b6b75]">{provider} - {desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Format */}
        <div className="p-5 bg-[#111117] rounded-xl border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4">Response Format</h3>
          <pre className="p-4 bg-[#0a0a0f] rounded-lg overflow-x-auto text-xs">
            <code className="text-emerald-400">{`{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1741569952,
  "model": "gemini-3-pro",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 50,
    "total_tokens": 60
  }
}`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
