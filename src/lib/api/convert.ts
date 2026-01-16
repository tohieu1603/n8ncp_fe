/**
 * Document Conversion API
 */

import { fetchApi } from './client'

export interface ConvertResponse {
  jobId: string
  status: string
  message: string
}

export interface ConvertStatusResponse {
  jobId: string
  status: 'processing' | 'completed' | 'failed'
  downloadUrl?: string
}

export async function convertWordToPdf(fileUrl: string, fileName?: string): Promise<ConvertResponse> {
  return fetchApi<ConvertResponse>('/api/convert/word-to-pdf', {
    method: 'POST',
    body: JSON.stringify({ fileUrl, fileName }),
  })
}

export async function convertPdfToWord(fileUrl: string, fileName?: string): Promise<ConvertResponse> {
  return fetchApi<ConvertResponse>('/api/convert/pdf-to-word', {
    method: 'POST',
    body: JSON.stringify({ fileUrl, fileName }),
  })
}

export async function getConvertStatus(jobId: string): Promise<ConvertStatusResponse> {
  return fetchApi<ConvertStatusResponse>(`/api/convert/status?jobId=${encodeURIComponent(jobId)}`)
}

export async function uploadFileForConvert(
  fileData: string,
  fileName: string,
  mimeType: string
): Promise<{ taskId: string; message: string }> {
  return fetchApi<{ taskId: string; message: string }>('/api/convert/upload', {
    method: 'POST',
    body: JSON.stringify({ fileData, fileName, mimeType }),
  })
}
