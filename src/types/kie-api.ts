export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9' | 'auto'

export type Resolution = '1K' | '2K' | '4K'

export type OutputFormat = 'png' | 'jpg'

export interface GenerateImageInput {
  prompt: string
  image_input?: string[]
  aspect_ratio?: AspectRatio
  resolution?: Resolution
  output_format?: OutputFormat
}

export interface CreateTaskRequest {
  model: 'nano-banana-pro'
  callBackUrl?: string
  input: GenerateImageInput
}

export interface CreateTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

// Raw response from KIE API
export interface TaskStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    model: string
    state: 'waiting' | 'queue' | 'processing' | 'success' | 'failed'
    param: string
    resultJson: string | null
    failCode: string | null
    failMsg: string | null
    costTime: number | null
    completeTime: number | null
    createTime: number
  }
}

export interface GenerationState {
  isLoading: boolean
  taskId: string | null
  status: 'idle' | 'creating' | 'polling' | 'completed' | 'error'
  imageUrl: string | null
  error: string | null
}
