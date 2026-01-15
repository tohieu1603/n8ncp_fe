'use client'

import { useState } from 'react'
import { User, Bell, Shield, Trash2, Save, Check, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { updateProfile } from '@/lib/api'

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({ name })
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    alert('Account deletion is not yet implemented')
    setShowDeleteConfirm(false)
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Settings</h1>
        <p className="text-[#a0a0a8] mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] mb-6 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-[#0a0a0f] border-b border-[rgba(255,255,255,0.08)]">
          <User size={18} className="text-[#a0a0a8]" />
          <h2 className="font-semibold text-[#f5f5f5]">Profile</h2>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#6b6b75] cursor-not-allowed"
            />
            <p className="text-xs text-[#6b6b75] mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5f5f5] placeholder:text-[#6b6b75] focus:outline-none focus:border-[#8b5cf6] transition-all"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || name === user?.name}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#8b5cf6] hover:bg-[#a78bfa] text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saved ? (
              <>
                <Check size={16} />
                Saved
              </>
            ) : saving ? (
              'Saving...'
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] mb-6 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-[#0a0a0f] border-b border-[rgba(255,255,255,0.08)]">
          <Bell size={18} className="text-[#a0a0a8]" />
          <h2 className="font-semibold text-[#f5f5f5]">Notifications</h2>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Email Notifications', desc: 'Receive updates about your account', defaultChecked: true },
            { label: 'Usage Alerts', desc: 'Get notified when credits are running low', defaultChecked: true },
            { label: 'Marketing Emails', desc: 'Receive news and promotions', defaultChecked: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.05)] last:border-b-0">
              <div>
                <p className="font-medium text-[#f5f5f5]">{item.label}</p>
                <p className="text-sm text-[#6b6b75] mt-0.5">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={item.defaultChecked} className="sr-only peer" />
                <div className="w-11 h-6 bg-[#1a1a22] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#6b6b75] after:border-[#1a1a22] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8b5cf6] peer-checked:after:bg-white"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] mb-6 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-[#0a0a0f] border-b border-[rgba(255,255,255,0.08)]">
          <Shield size={18} className="text-[#a0a0a8]" />
          <h2 className="font-semibold text-[#f5f5f5]">Security</h2>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Password', desc: 'Last changed: Never', action: 'Change Password' },
            { label: 'Two-Factor Authentication', desc: 'Add an extra layer of security', action: 'Enable 2FA' },
            { label: 'Active Sessions', desc: 'Manage devices where you\'re logged in', action: 'View Sessions' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.05)] last:border-b-0">
              <div>
                <p className="font-medium text-[#f5f5f5]">{item.label}</p>
                <p className="text-sm text-[#6b6b75] mt-0.5">{item.desc}</p>
              </div>
              <button className="px-4 py-2 bg-[#1a1a22] text-[#a0a0a8] text-sm font-medium rounded-lg hover:bg-[#222230] hover:text-[#f5f5f5] transition-colors">
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#111117] rounded-2xl border border-[rgba(239,68,68,0.3)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-[rgba(239,68,68,0.1)] border-b border-[rgba(239,68,68,0.2)]">
          <Trash2 size={18} className="text-red-400" />
          <h2 className="font-semibold text-red-400">Danger Zone</h2>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-400">Delete Account</p>
              <p className="text-sm text-[#6b6b75] mt-0.5">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-red-400 text-sm font-medium rounded-lg hover:bg-[rgba(239,68,68,0.2)] transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md bg-[#111117] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center bg-[rgba(239,68,68,0.15)] rounded-xl">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-[#f5f5f5]">Delete Account?</h2>
            </div>
            <p className="text-[#a0a0a8] mb-6">
              This action cannot be undone. All your data, including API keys,
              usage history, and credits will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-[#1a1a22] text-[#a0a0a8] font-semibold rounded-xl hover:bg-[#222230] hover:text-[#f5f5f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
