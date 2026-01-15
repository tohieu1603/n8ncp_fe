'use client'

import { useState, useEffect } from 'react'
import { Coins, QrCode, Clock, RefreshCw, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { getPaymentHistory, createPayment, PaymentHistory } from '@/lib/api'

// Giá: 1 token = 1 VND
const TOKEN_PRICE = 1

export default function BillingPage() {
  const { user, refreshUser } = useAuth()
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [tokenAmount, setTokenAmount] = useState<string>('10000')
  const [paymentData, setPaymentData] = useState<{
    qrCode: string
    amount: number
    transactionId: string
    expiresAt: string
  } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    try {
      const data = await getPaymentHistory()
      setPayments(data)
    } catch (error) {
      console.error('Failed to load payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTokenAmountChange = (value: string) => {
    // Chỉ cho phép số
    const numericValue = value.replace(/[^0-9]/g, '')
    setTokenAmount(numericValue)
    setError('')
  }

  const getAmount = () => {
    const tokens = parseInt(tokenAmount) || 0
    return tokens * TOKEN_PRICE
  }

  const handlePurchase = async () => {
    const tokens = parseInt(tokenAmount) || 0

    // Validate
    if (tokens < 1000) {
      setError('Số token tối thiểu là 1,000')
      return
    }

    if (tokens > 100000000) {
      setError('Số token tối đa là 100,000,000')
      return
    }

    setShowPaymentModal(true)
    setProcessing(true)
    setError('')

    try {
      const result = await createPayment({
        planId: `tokens_${tokens}`,
        amount: getAmount(),
      })
      setPaymentData(result)
    } catch (error) {
      console.error('Failed to create payment:', error)
      setError('Không thể tạo thanh toán. Vui lòng thử lại.')
      setShowPaymentModal(false)
    } finally {
      setProcessing(false)
    }
  }

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const quickAmounts = [10000, 50000, 100000, 500000]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Nạp Token</h1>
          <p className="text-[#a0a0a8] mt-1">1 token = 1 VND</p>
        </div>
        <button
          onClick={refreshUser}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a22] border border-[rgba(255,255,255,0.08)] text-[#a0a0a8] font-medium rounded-xl hover:bg-[#222230] hover:text-[#f5f5f5] transition-all"
        >
          <RefreshCw size={16} />
          Làm mới
        </button>
      </div>

      {/* Token Balance Card */}
      <div className="mb-8 p-6 bg-gradient-to-r from-[#8b5cf6] via-[#7c3aed] to-[#6366f1] rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 flex items-center justify-center bg-white/20 backdrop-blur rounded-xl">
            <Coins size={28} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">Token hiện có</p>
            <p className="text-3xl font-bold text-white">
              {(user?.tokenBalance || 0).toLocaleString()}
            </p>
          </div>
        </div>
        {(user?.tokenBalance || 0) < 5000 && (
          <div className="mt-4 p-3 bg-white/10 backdrop-blur rounded-xl flex items-center gap-2 text-white/90">
            <AlertCircle size={18} />
            <span className="text-sm">Token sắp hết! Nạp thêm để tiếp tục sử dụng.</span>
          </div>
        )}
      </div>

      {/* Purchase Section */}
      <div className="mb-8 p-6 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)]">
        <h2 className="text-lg font-bold text-[#f5f5f5] mb-4">Nhập số token muốn nạp</h2>

        {/* Token Input */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={tokenAmount}
              onChange={(e) => handleTokenAmountChange(e.target.value)}
              placeholder="Nhập số token..."
              className="w-full px-4 py-4 bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5f5f5] text-xl font-semibold text-center focus:outline-none focus:border-[#8b5cf6] transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6b75] font-medium">
              token
            </span>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
              <AlertCircle size={14} />
              {error}
            </p>
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => setTokenAmount(amount.toString())}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tokenAmount === amount.toString()
                  ? 'bg-[#8b5cf6] text-white'
                  : 'bg-[#1a1a22] text-[#a0a0a8] hover:bg-[#222230] hover:text-[#f5f5f5]'
              }`}
            >
              {amount.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Amount Summary */}
        <div className="p-4 bg-[#0a0a0f] rounded-xl mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#6b6b75]">Số token:</span>
            <span className="text-[#f5f5f5] font-semibold">
              {parseInt(tokenAmount || '0').toLocaleString()} token
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#6b6b75]">Đơn giá:</span>
            <span className="text-[#a0a0a8]">1 VND/token</span>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-[#f5f5f5] font-semibold">Tổng thanh toán:</span>
              <span className="text-xl font-bold text-[#8b5cf6]">
                {formatVND(getAmount())}
              </span>
            </div>
          </div>
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={!tokenAmount || parseInt(tokenAmount) < 1000}
          className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white font-bold text-lg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Coins size={20} />
          Nạp Token
        </button>

        <p className="mt-3 text-center text-xs text-[#6b6b75]">
          Tối thiểu 1,000 token • Thanh toán qua QR Code
        </p>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-bold text-[#f5f5f5] mb-4">Lịch sử nạp token</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-[#222230] border-t-[#8b5cf6] rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)]">
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-[#1a1a22] rounded-2xl">
              <Coins size={24} className="text-[#6b6b75]" />
            </div>
            <p className="text-[#6b6b75]">Chưa có lịch sử nạp token</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-[#111117] rounded-xl border border-[rgba(255,255,255,0.08)]"
              >
                <div>
                  <p className="font-semibold text-[#f5f5f5]">{payment.description}</p>
                  <p className="text-sm text-[#6b6b75] mt-1">{formatDate(payment.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${
                      payment.status === 'completed'
                        ? 'bg-[rgba(34,197,94,0.15)] text-green-400'
                        : payment.status === 'pending'
                        ? 'bg-[rgba(245,158,11,0.15)] text-amber-400'
                        : 'bg-[rgba(239,68,68,0.15)] text-red-400'
                    }`}
                  >
                    {payment.status === 'completed' ? 'Thành công' : payment.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                  </span>
                  <p className="font-bold text-[#f5f5f5] mt-1">{formatVND(payment.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !processing && setShowPaymentModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#111117] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#f5f5f5] mb-2">Thanh toán</h2>
            <p className="text-[#a0a0a8] mb-6">
              Nạp {parseInt(tokenAmount).toLocaleString()} token
            </p>

            {processing ? (
              <div className="py-12">
                <div className="w-10 h-10 mx-auto mb-4 border-3 border-[#222230] border-t-[#8b5cf6] rounded-full animate-spin" />
                <p className="text-[#a0a0a8]">Đang tạo mã QR...</p>
              </div>
            ) : paymentData ? (
              <>
                <div className="inline-flex items-center justify-center p-6 mb-6 bg-white rounded-2xl">
                  <QrCode size={160} className="text-slate-800" />
                </div>

                <p className="text-sm text-[#a0a0a8] mb-4">Quét mã bằng ứng dụng ngân hàng</p>

                <div className="p-4 mb-4 bg-[#0a0a0f] rounded-xl text-left space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b75]">Số tiền:</span>
                    <span className="font-semibold text-[#f5f5f5]">{formatVND(paymentData.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b75]">Token nhận được:</span>
                    <span className="font-semibold text-[#8b5cf6]">{paymentData.amount.toLocaleString()} token</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b75]">Mã GD:</span>
                    <code className="text-xs font-mono text-[#8b5cf6]">{paymentData.transactionId}</code>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)] text-amber-400">
                    <Clock size={14} />
                    <span className="text-sm font-medium">Hết hạn sau 15 phút</span>
                  </div>
                </div>

                <p className="text-xs text-[#6b6b75] mb-4">
                  Thanh toán qua <strong className="text-[#a0a0a8]">SePay</strong> • Token được cộng trong 1-2 phút
                </p>
              </>
            ) : (
              <div className="py-8 text-red-400">
                Không thể tạo thanh toán. Vui lòng thử lại.
              </div>
            )}

            <button
              onClick={() => {
                setShowPaymentModal(false)
                setPaymentData(null)
                loadPayments()
                refreshUser()
              }}
              className="w-full py-3 bg-[#1a1a22] text-[#a0a0a8] font-semibold rounded-xl hover:bg-[#222230] hover:text-[#f5f5f5] transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
