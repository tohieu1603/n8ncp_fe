'use client'

import { useState, useEffect } from 'react'
import { Key, Copy, Plus, Trash2, Check, AlertTriangle, Shield, Eye, EyeOff } from 'lucide-react'
import { getApiKeys, createApiKey, deleteApiKey, revealApiKey, ApiKey } from '@/lib/api'

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Map<string, string>>(new Map()) // id -> full key
  const [revealingId, setRevealingId] = useState<string | null>(null)

  useEffect(() => { loadKeys() }, [])

  const loadKeys = async () => {
    try { const data = await getApiKeys(); setKeys(data) }
    catch (error) { console.error('Failed to load API keys:', error) }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    try { const result = await createApiKey(newKeyName.trim()); setNewKey(result.key); setKeys((prev) => [result.apiKey, ...prev]); setNewKeyName('') }
    catch (error) { console.error('Failed to create API key:', error) }
    finally { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return
    try { await deleteApiKey(id); setKeys((prev) => prev.filter((k) => k.id !== id)) }
    catch (error) { console.error('Failed to delete API key:', error) }
  }

  const toggleKeyVisibility = async (id: string) => {
    // If already revealed, hide it
    if (revealedKeys.has(id)) {
      const newMap = new Map(revealedKeys)
      newMap.delete(id)
      setRevealedKeys(newMap)
      return
    }

    // Fetch full key from API
    setRevealingId(id)
    try {
      const fullKey = await revealApiKey(id)
      setRevealedKeys(prev => new Map(prev).set(id, fullKey))
    } catch (error) {
      console.error('Failed to reveal API key:', error)
    } finally {
      setRevealingId(null)
    }
  }

  const getDisplayKey = (key: ApiKey) => {
    if (revealedKeys.has(key.id)) {
      return revealedKeys.get(key.id)!
    }
    return key.key // Already masked from backend
  }

  const copyKey = async (id: string) => {
    let keyToCopy = revealedKeys.get(id)

    // If not revealed, fetch it first
    if (!keyToCopy) {
      try {
        keyToCopy = await revealApiKey(id)
      } catch (error) {
        console.error('Failed to get API key for copy:', error)
        return
      }
    }

    await navigator.clipboard.writeText(keyToCopy)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">API Keys</h1>
          <p className="text-[#a0a0a8] mt-1 text-sm">Manage your API keys for programmatic access</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#8b5cf6] hover:bg-[#a78bfa] text-white font-medium rounded-xl transition-colors">
          <Plus size={18} /> Create New Key
        </button>
      </div>

      {/* Security Warning */}
      <div className="flex gap-4 p-4 mb-6 bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)] rounded-xl">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[rgba(251,191,36,0.15)] rounded-lg">
          <AlertTriangle size={20} className="text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-400">Keep your API keys secure!</h3>
          <p className="text-sm text-[#a0a0a8] mt-1">API keys are only shown once when created. Store them securely - you won&apos;t be able to view them again.</p>
        </div>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-3 border-[#222230] border-t-[#8b5cf6] rounded-full animate-spin" /></div>
        ) : keys.length === 0 ? (
          <div className="text-center py-16 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)]">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-[#1a1a22] rounded-2xl"><Key size={28} className="text-[#6b6b75]" /></div>
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">No API Keys</h3>
            <p className="text-[#6b6b75]">Create your first API key to start using the API</p>
          </div>
        ) : keys.map((key) => (
          <div key={key.id} className="p-5 bg-[#111117] rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(139,92,246,0.3)] transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 flex items-center justify-center bg-[rgba(139,92,246,0.15)] rounded-lg"><Shield size={18} className="text-[#8b5cf6]" /></div>
                  <span className="font-semibold text-[#f5f5f5]">{key.name}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 px-3 py-2 bg-[#0a0a0f] rounded-lg font-mono text-sm text-[#a0a0a8] truncate">
                    {getDisplayKey(key)}
                  </code>
                  {key.canReveal && (
                    <button onClick={() => toggleKeyVisibility(key.id)} disabled={revealingId === key.id} className="p-2 rounded-lg bg-[#1a1a22] text-[#a0a0a8] hover:bg-[rgba(139,92,246,0.15)] hover:text-[#8b5cf6] transition-colors disabled:opacity-50" title={revealedKeys.has(key.id) ? "Hide key" : "Show key"}>
                      {revealingId === key.id ? <div className="w-4 h-4 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" /> : revealedKeys.has(key.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                  <button onClick={() => copyKey(key.id)} className="p-2 rounded-lg bg-[#1a1a22] text-[#a0a0a8] hover:bg-[rgba(139,92,246,0.15)] hover:text-[#8b5cf6] transition-colors" title="Copy to clipboard">
                    {copiedId === key.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="text-xs text-[#6b6b75]">Created: {new Date(key.createdAt).toLocaleDateString()}{key.lastUsedAt && <span> | Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}</div>
              </div>
              <button onClick={() => handleDelete(key.id)} className="self-start p-2.5 rounded-xl bg-[rgba(239,68,68,0.1)] text-red-400 hover:bg-[rgba(239,68,68,0.2)] hover:text-red-300 transition-colors" title="Delete key"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !newKey && setShowCreateModal(false)}>
          <div className="w-full max-w-md bg-[#111117] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            {newKey ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-[rgba(34,197,94,0.15)] rounded-xl"><Check size={20} className="text-green-400" /></div>
                  <h2 className="text-xl font-bold text-[#f5f5f5]">API Key Created</h2>
                </div>
                <div className="p-4 mb-4 bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)] rounded-xl"><p className="text-sm text-amber-400"><strong>Important:</strong> Copy your API key now. You won&apos;t be able to see it again!</p></div>
                <div className="flex items-center gap-2 p-3 mb-6 bg-[#0a0a0f] rounded-xl">
                  <code className="flex-1 font-mono text-sm text-[#a0a0a8] break-all">{newKey}</code>
                  <button onClick={async () => { await navigator.clipboard.writeText(newKey); setCopiedId('new'); setTimeout(() => setCopiedId(null), 2000) }} className="p-2 rounded-lg bg-[#1a1a22] text-[#a0a0a8] hover:bg-[rgba(139,92,246,0.15)] hover:text-[#8b5cf6] transition-colors">{copiedId === 'new' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}</button>
                </div>
                <button onClick={() => { setShowCreateModal(false); setNewKey(null) }} className="w-full py-3 bg-[#8b5cf6] hover:bg-[#a78bfa] text-white font-semibold rounded-xl transition-colors">Done</button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-[#f5f5f5] mb-6">Create API Key</h2>
                <input type="text" placeholder="Key name (e.g., Production, Development)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} className="w-full px-4 py-3 mb-6 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5f5f5] placeholder:text-[#6b6b75] focus:outline-none focus:border-[#8b5cf6] transition-colors" />
                <div className="flex gap-3">
                  <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-[#1a1a22] text-[#a0a0a8] font-semibold rounded-xl hover:bg-[#222230] hover:text-[#f5f5f5] transition-colors">Cancel</button>
                  <button onClick={handleCreate} disabled={!newKeyName.trim() || creating} className="flex-1 py-3 bg-[#8b5cf6] text-white font-semibold rounded-xl hover:bg-[#a78bfa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{creating ? 'Creating...' : 'Create'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
