/**
 * Billing/Payment API
 */

import { fetchApi } from './client'

export interface PaymentHistory {
  id: string
  amount: number
  status: 'pending' | 'completed' | 'failed' | 'expired'
  description: string
  createdAt: string
  transactionId?: string
  qrCode?: string
  expiresAt?: string
}

export interface CreatePaymentResponse {
  qrCode: string
  amount: number
  transactionId: string
  expiresAt: string
}

export async function getPaymentHistory(): Promise<PaymentHistory[]> {
  return fetchApi<PaymentHistory[]>('/api/billing/history')
}

export async function createPayment(params: {
  planId: string
  amount: number
}): Promise<CreatePaymentResponse> {
  return fetchApi<CreatePaymentResponse>('/api/billing/create', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function checkPaymentStatus(transactionId: string): Promise<{
  status: string
  completedAt: string | null
}> {
  return fetchApi(`/api/billing/check/${transactionId}`)
}
