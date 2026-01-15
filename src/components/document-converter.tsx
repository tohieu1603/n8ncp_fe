'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Download, Loader2, ArrowRight, X, RefreshCw } from 'lucide-react'
import { convertWordToPdf, convertPdfToWord, getConvertStatus, uploadFileForConvert } from '@/lib/api'

type ConversionType = 'word-to-pdf' | 'pdf-to-word'

interface ConversionJob {
  id: string
  fileName: string
  type: ConversionType
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  error?: string
}

export default function DocumentConverter() {
  const [conversionType, setConversionType] = useState<ConversionType>('word-to-pdf')
  const [jobs, setJobs] = useState<ConversionJob[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedFormats = conversionType === 'word-to-pdf'
    ? '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : '.pdf,application/pdf'

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      await processFile(file)
    }
  }

  const processFile = async (file: File) => {
    const jobId = Date.now().toString() + Math.random().toString(36).substr(2, 9)

    const newJob: ConversionJob = {
      id: jobId,
      fileName: file.name,
      type: conversionType,
      status: 'uploading',
    }

    setJobs((prev) => [newJob, ...prev])

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file)
      const base64Data = base64.split(',')[1] // Remove data URL prefix

      // For now, we'll use a placeholder URL approach
      // In production, you'd upload to a storage service first
      const dataUrl = base64

      updateJob(jobId, { status: 'processing' })

      // Call conversion API
      const response = conversionType === 'word-to-pdf'
        ? await convertWordToPdf(dataUrl, file.name)
        : await convertPdfToWord(dataUrl, file.name)

      // Poll for completion
      pollJobStatus(jobId, response.jobId)
    } catch (error) {
      updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Conversion failed',
      })
    }
  }

  const pollJobStatus = async (localJobId: string, remoteJobId: string, attempts = 0) => {
    if (attempts >= 60) {
      updateJob(localJobId, { status: 'failed', error: 'Conversion timed out' })
      return
    }

    try {
      const status = await getConvertStatus(remoteJobId)

      if (status.status === 'completed' && status.downloadUrl) {
        updateJob(localJobId, {
          status: 'completed',
          downloadUrl: status.downloadUrl,
        })
      } else if (status.status === 'failed') {
        updateJob(localJobId, {
          status: 'failed',
          error: 'Conversion failed',
        })
      } else {
        setTimeout(() => pollJobStatus(localJobId, remoteJobId, attempts + 1), 2000)
      }
    } catch {
      setTimeout(() => pollJobStatus(localJobId, remoteJobId, attempts + 1), 2000)
    }
  }

  const updateJob = (jobId: string, updates: Partial<ConversionJob>) => {
    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job)))
  }

  const removeJob = (jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId))
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDownload = (downloadUrl: string, fileName: string) => {
    const extension = conversionType === 'word-to-pdf' ? 'pdf' : 'docx'
    const baseName = fileName.replace(/\.[^/.]+$/, '')
    const newFileName = `${baseName}.${extension}`

    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = newFileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="convert-container">
      {/* Conversion Type Toggle */}
      <div className="convert-type-toggle">
        <button
          className={`convert-type-btn ${conversionType === 'word-to-pdf' ? 'active' : ''}`}
          onClick={() => setConversionType('word-to-pdf')}
        >
          <FileText size={16} />
          Word
          <ArrowRight size={14} />
          <FileText size={16} style={{ color: '#ef4444' }} />
          PDF
        </button>
        <button
          className={`convert-type-btn ${conversionType === 'pdf-to-word' ? 'active' : ''}`}
          onClick={() => setConversionType('pdf-to-word')}
        >
          <FileText size={16} style={{ color: '#ef4444' }} />
          PDF
          <ArrowRight size={14} />
          <FileText size={16} />
          Word
        </button>
      </div>

      {/* Upload Area */}
      <div
        className={`convert-upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={48} strokeWidth={1.5} />
        <h3>Drop your files here</h3>
        <p>or click to browse</p>
        <span className="convert-formats">
          {conversionType === 'word-to-pdf'
            ? 'Supported: .doc, .docx'
            : 'Supported: .pdf'}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Jobs List */}
      {jobs.length > 0 && (
        <div className="convert-jobs">
          {jobs.map((job) => (
            <div key={job.id} className={`convert-job convert-job-${job.status}`}>
              <div className="convert-job-icon">
                <FileText size={24} />
              </div>
              <div className="convert-job-info">
                <span className="convert-job-name">{job.fileName}</span>
                <span className="convert-job-status">
                  {job.status === 'uploading' && 'Uploading...'}
                  {job.status === 'processing' && 'Converting...'}
                  {job.status === 'completed' && 'Completed'}
                  {job.status === 'failed' && (job.error || 'Failed')}
                </span>
              </div>
              <div className="convert-job-actions">
                {job.status === 'uploading' || job.status === 'processing' ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : job.status === 'completed' && job.downloadUrl ? (
                  <button
                    className="convert-download-btn"
                    onClick={() => handleDownload(job.downloadUrl!, job.fileName)}
                  >
                    <Download size={16} />
                    Download
                  </button>
                ) : job.status === 'failed' ? (
                  <button
                    className="convert-retry-btn"
                    onClick={() => {
                      removeJob(job.id)
                      // Could retry here
                    }}
                  >
                    <RefreshCw size={16} />
                  </button>
                ) : null}
                <button className="convert-remove-btn" onClick={() => removeJob(job.id)}>
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .convert-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 32px;
        }

        .convert-type-toggle {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          justify-content: center;
        }

        .convert-type-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          background: var(--bg-primary, #fff);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .convert-type-btn:hover {
          border-color: var(--primary-color, #8b5cf6);
        }

        .convert-type-btn.active {
          border-color: var(--primary-color, #8b5cf6);
          background: var(--primary-light, #f5f3ff);
        }

        .convert-upload-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
          border: 2px dashed var(--border-color, #e5e7eb);
          border-radius: 16px;
          background: var(--bg-secondary, #f9fafb);
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .convert-upload-area:hover,
        .convert-upload-area.dragging {
          border-color: var(--primary-color, #8b5cf6);
          background: var(--primary-light, #f5f3ff);
        }

        .convert-upload-area h3 {
          margin: 16px 0 4px;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #111827);
        }

        .convert-upload-area p {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary, #6b7280);
        }

        .convert-formats {
          margin-top: 12px;
          font-size: 12px;
          color: var(--text-tertiary, #9ca3af);
        }

        .convert-jobs {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .convert-job {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          background: var(--bg-primary, #fff);
        }

        .convert-job-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary, #f3f4f6);
          border-radius: 8px;
          color: var(--text-secondary, #6b7280);
        }

        .convert-job-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .convert-job-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #111827);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .convert-job-status {
          font-size: 12px;
          color: var(--text-tertiary, #9ca3af);
        }

        .convert-job-completed .convert-job-status {
          color: #22c55e;
        }

        .convert-job-failed .convert-job-status {
          color: #ef4444;
        }

        .convert-job-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .convert-download-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--primary-color, #8b5cf6);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .convert-download-btn:hover {
          background: var(--primary-dark, #7c3aed);
        }

        .convert-retry-btn,
        .convert-remove-btn {
          padding: 8px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-tertiary, #9ca3af);
          cursor: pointer;
          transition: all 0.2s;
        }

        .convert-retry-btn:hover,
        .convert-remove-btn:hover {
          background: var(--bg-secondary, #f3f4f6);
          color: var(--text-secondary, #6b7280);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
