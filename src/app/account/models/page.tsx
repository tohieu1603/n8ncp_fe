'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Cpu,
  Image,
  MessageSquare,
  Zap,
  Crown,
  ExternalLink,
  Check,
  Sparkles,
  ChevronDown,
  Lock,
} from 'lucide-react'
import { getAgents, Agent } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

interface ModelTier {
  id: string
  name: string
  tier: 'base' | 'pro'
  pricing: {
    input?: string
    output?: string
    perImage?: string
  }
  features: string[]
}

interface ModelInfo {
  id: string
  name: string
  description: string
  type: 'image' | 'chat'
  tiers: ModelTier[]
  capabilities: string[]
  contextWindow?: string
}

const IMAGE_MODELS: ModelInfo[] = [
  {
    id: 'kie-image-gen',
    name: 'KIE Image Generation',
    description: 'State-of-the-art image generation model powered by advanced diffusion techniques',
    type: 'image',
    tiers: [
      {
        id: 'kie-image-base',
        name: 'Base',
        tier: 'base',
        pricing: { perImage: '18 credits (~$0.09)' },
        features: ['Standard quality', 'Up to 1K resolution', 'Basic styles'],
      },
      {
        id: 'kie-image-pro',
        name: 'Pro',
        tier: 'pro',
        pricing: { perImage: '36 credits (~$0.18)' },
        features: ['Ultra HD quality', 'Up to 4K resolution', 'All styles', 'Priority queue'],
      },
    ],
    capabilities: [
      'High-quality image generation',
      'Multiple aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4)',
      'Various resolutions up to 4K',
      'Style customization',
      'Fast generation (~10-30s)',
    ],
  },
]

const CHAT_MODELS: ModelInfo[] = [
  {
    id: 'gemini-3',
    name: 'Gemini 3',
    description: 'Advanced language model with multimodal capabilities',
    type: 'chat',
    tiers: [
      {
        id: 'gemini-3-flash',
        name: 'Flash (Base)',
        tier: 'base',
        pricing: { input: '$0.0005 / 1K tokens', output: '$0.0005 / 1K tokens' },
        features: ['Fast response', '500K context', 'Basic reasoning'],
      },
      {
        id: 'gemini-3-pro',
        name: 'Pro',
        tier: 'pro',
        pricing: { input: '$0.001 / 1K tokens', output: '$0.001 / 1K tokens' },
        features: ['Advanced reasoning', '1M context', 'Priority support', 'All capabilities'],
      },
    ],
    capabilities: [
      'Advanced reasoning and analysis',
      'Code generation and review',
      'Document understanding',
      'Image analysis (vision)',
      'Creative writing',
      'Multi-turn conversations',
    ],
    contextWindow: '1M tokens',
  },
]

export default function ModelsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'image' | 'chat'>('chat')
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({})
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    loadAgents()
    // Initialize selected tiers to base
    const initialTiers: Record<string, string> = {}
    CHAT_MODELS.forEach((model) => {
      initialTiers[model.id] = model.tiers[0].id
    })
    IMAGE_MODELS.forEach((model) => {
      initialTiers[model.id] = model.tiers[0].id
    })
    setSelectedTiers(initialTiers)
  }, [])

  const loadAgents = async () => {
    try {
      const data = await getAgents()
      setAgents(data)
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupedAgents = agents.reduce(
    (acc, agent) => {
      if (!acc[agent.category]) {
        acc[agent.category] = []
      }
      acc[agent.category].push(agent)
      return acc
    },
    {} as Record<string, Agent[]>
  )

  const categoryNames: Record<string, string> = {
    general: 'General',
    image: 'Image Analysis',
    document: 'Document',
    code: 'Code',
    creative: 'Creative',
  }

  const handleTierSelect = (modelId: string, tier: ModelTier) => {
    if (tier.tier === 'pro' && !user?.isPro) {
      router.push('/account/billing')
      return
    }
    setSelectedTiers((prev) => ({ ...prev, [modelId]: tier.id }))
    setOpenDropdown(null)
  }

  const getSelectedTier = (model: ModelInfo): ModelTier => {
    const selectedId = selectedTiers[model.id]
    return model.tiers.find((t) => t.id === selectedId) || model.tiers[0]
  }

  const TierSelector = ({ model }: { model: ModelInfo }) => {
    const selectedTier = getSelectedTier(model)
    const isOpen = openDropdown === model.id

    return (
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : model.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
            selectedTier.tier === 'pro'
              ? 'bg-gradient-to-r from-amber-400/20 to-orange-500/20 border-amber-500/50 text-amber-400'
              : 'bg-[#1a1a22] border-[rgba(255,255,255,0.08)] text-[#f5f5f5] hover:border-[rgba(139,92,246,0.3)]'
          }`}
        >
          {selectedTier.tier === 'pro' && <Crown size={14} />}
          <span className="font-medium">{selectedTier.name}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#111117] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-xl z-10 overflow-hidden">
            {model.tiers.map((tier) => {
              const isLocked = tier.tier === 'pro' && !user?.isPro
              const isSelected = selectedTier.id === tier.id

              return (
                <button
                  key={tier.id}
                  onClick={() => handleTierSelect(model.id, tier)}
                  className={`w-full p-4 text-left transition-colors ${
                    isSelected ? 'bg-[#1a1a22]' : 'hover:bg-[#1a1a22]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {tier.tier === 'pro' && <Crown size={14} className="text-amber-400" />}
                      <span className={`font-semibold ${tier.tier === 'pro' ? 'text-amber-400' : 'text-[#f5f5f5]'}`}>
                        {tier.name}
                      </span>
                    </div>
                    {isLocked && <Lock size={14} className="text-[#6b6b75]" />}
                    {isSelected && <Check size={14} className="text-green-400" />}
                  </div>
                  <div className="text-xs text-[#6b6b75] mb-2">
                    {tier.pricing.perImage || `Input: ${tier.pricing.input}`}
                  </div>
                  <ul className="space-y-1">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-[#a0a0a8]">
                        <Check size={10} className="text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isLocked && (
                    <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                      <span className="text-xs text-amber-400 font-medium">Upgrade to Pro to unlock</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Models</h1>
        <p className="text-[#a0a0a8] mt-1">Explore available AI models and their capabilities</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 mb-8 bg-[#1a1a22] rounded-xl w-fit">
        <button
          onClick={() => setSelectedTab('chat')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            selectedTab === 'chat'
              ? 'bg-[#222230] text-[#f5f5f5] shadow-sm'
              : 'text-[#a0a0a8] hover:text-[#f5f5f5]'
          }`}
        >
          <MessageSquare size={16} />
          Chat Models
        </button>
        <button
          onClick={() => setSelectedTab('image')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            selectedTab === 'image'
              ? 'bg-[#222230] text-[#f5f5f5] shadow-sm'
              : 'text-[#a0a0a8] hover:text-[#f5f5f5]'
          }`}
        >
          <Image size={16} />
          Image Models
        </button>
      </div>

      {selectedTab === 'chat' ? (
        <>
          {/* Chat Models */}
          {CHAT_MODELS.map((model) => {
            const selectedTier = getSelectedTier(model)
            return (
              <div key={model.id} className="p-6 bg-[#111117] border border-[rgba(139,92,246,0.3)] rounded-2xl mb-8">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
                  <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl text-white flex-shrink-0">
                    <Cpu size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                      <h2 className="text-xl font-bold text-[#f5f5f5]">{model.name}</h2>
                      <TierSelector model={model} />
                    </div>
                    <p className="text-[#a0a0a8] text-sm">{model.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-bold text-[#6b6b75] uppercase tracking-wide mb-3">
                      Pricing ({selectedTier.name})
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-xl">
                        <span className="text-sm text-[#a0a0a8]">Input</span>
                        <span className="text-sm font-semibold text-[#8b5cf6]">{selectedTier.pricing.input}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-xl">
                        <span className="text-sm text-[#a0a0a8]">Output</span>
                        <span className="text-sm font-semibold text-[#8b5cf6]">{selectedTier.pricing.output}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-xl">
                        <span className="text-sm text-[#a0a0a8]">Context Window</span>
                        <span className="text-sm font-semibold text-[#8b5cf6]">{model.contextWindow}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#6b6b75] uppercase tracking-wide mb-3">Capabilities</h3>
                    <ul className="space-y-2">
                      {model.capabilities.map((cap, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-[#a0a0a8]">
                          <Check size={14} className="text-green-500 flex-shrink-0" />
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Agents Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={20} className="text-amber-500" />
              <h2 className="text-xl font-bold text-[#f5f5f5]">Specialized Agents</h2>
            </div>
            <p className="text-[#a0a0a8] text-sm mb-6">
              Pre-configured agents with specialized prompts for different tasks
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-[#222230] border-t-[#8b5cf6] rounded-full animate-spin" />
              </div>
            ) : (
              Object.entries(groupedAgents).map(([category, categoryAgents]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-xs font-bold text-[#6b6b75] uppercase tracking-wide mb-3">
                    {categoryNames[category] || category}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {categoryAgents.map((agent) => {
                      const isLocked = agent.tier === 'pro' && !user?.isPro
                      return (
                        <div
                          key={agent.id}
                          className={`relative p-4 bg-[#111117] rounded-xl border transition-all ${
                            agent.tier === 'pro'
                              ? 'border-[rgba(251,191,36,0.3)] hover:border-[rgba(251,191,36,0.5)]'
                              : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(139,92,246,0.3)]'
                          } ${isLocked ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-[#f5f5f5]">{agent.name}</span>
                            {agent.tier === 'pro' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded-full">
                                <Crown size={10} />
                                PRO
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#a0a0a8]">{agent.description}</p>
                          {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#111117]/90 rounded-xl">
                              <span className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
                                <Crown size={16} />
                                Upgrade to Pro
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {/* Image Models */}
          {IMAGE_MODELS.map((model) => {
            const selectedTier = getSelectedTier(model)
            return (
              <div key={model.id} className="p-6 bg-[#111117] border border-[rgba(16,185,129,0.3)] rounded-2xl mb-8">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
                  <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white flex-shrink-0">
                    <Image size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                      <h2 className="text-xl font-bold text-[#f5f5f5]">{model.name}</h2>
                      <TierSelector model={model} />
                    </div>
                    <p className="text-[#a0a0a8] text-sm">{model.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-bold text-[#6b6b75] uppercase tracking-wide mb-3">
                      Pricing ({selectedTier.name})
                    </h3>
                    <div className="flex justify-between p-3 bg-[#0a0a0f] rounded-xl">
                      <span className="text-sm text-[#a0a0a8]">Per Image</span>
                      <span className="text-sm font-semibold text-emerald-400">{selectedTier.pricing.perImage}</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-[#6b6b75] uppercase tracking-wide mb-2">
                        {selectedTier.name} Features
                      </h4>
                      <ul className="space-y-1.5">
                        {selectedTier.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-[#a0a0a8]">
                            <Check size={12} className="text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#6b6b75] uppercase tracking-wide mb-3">Capabilities</h3>
                    <ul className="space-y-2">
                      {model.capabilities.map((cap, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-[#a0a0a8]">
                          <Check size={14} className="text-green-500 flex-shrink-0" />
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* API Documentation Link */}
      <div className="p-6 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] text-center">
        <h3 className="text-lg font-bold text-[#f5f5f5] mb-2">API Documentation</h3>
        <p className="text-[#a0a0a8] text-sm mb-4">Learn how to integrate these models into your applications</p>
        <a
          href="#"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#8b5cf6] hover:bg-[#a78bfa] text-white font-semibold rounded-xl transition-colors"
        >
          View Documentation
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  )
}
