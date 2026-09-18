import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const MAX_DURATION_SECONDS = 120 // 2 minutes
const TARGET_BITRATE = '2000k' // 2 Mbps
const TARGET_RESOLUTION = '720' // 720p
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

let ffmpeg: FFmpeg | null = null

async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg

  ffmpeg = new FFmpeg()

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return ffmpeg
}

export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('No se pudo leer la duración del video'))
    }
    
    video.src = URL.createObjectURL(file)
  })
}

export async function compressVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  // Validate duration
  const duration = await getVideoDuration(file)
  if (duration > MAX_DURATION_SECONDS) {
    throw new Error(`El video dura ${Math.round(duration)}s. Máximo permitido: ${MAX_DURATION_SECONDS}s (2 minutos)`)
  }

  // Validate size
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`El video supera los 100MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
  }

  // Skip compression if already small enough (< 30MB)
  if (file.size < 30 * 1024 * 1024) {
    return file
  }

  const ffmpeg = await loadFFmpeg()

  const inputName = `input-${file.name}`
  const outputName = `output-${file.name.replace(/\.[^/.]+$/, '')}.mp4`

  await ffmpeg.writeFile(inputName, await fetchFile(file))

  // Set up progress tracking
  ffmpeg.on('progress', ({ progress }) => {
    onProgress?.(Math.min(progress * 100, 100))
  })

  // Compress video: 720p, 2Mbps, H.264 codec
  await ffmpeg.exec([
    '-i', inputName,
    '-vf', `scale=-2:${TARGET_RESOLUTION}`,
    '-c:v', 'libx264',
    '-b:v', TARGET_BITRATE,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    outputName,
  ])

  const data = await ffmpeg.readFile(outputName)
  
  // Clean up
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.deleteFile(outputName)

  // Convert to Blob and then File
  // data is FileData which is string | Uint8Array, we need binary
  if (typeof data === 'string') {
    throw new Error('Unexpected string output from FFmpeg')
  }
  
  // Copy data to new ArrayBuffer to avoid SharedArrayBuffer issues
  const arrayBuffer = new ArrayBuffer(data.byteLength)
  const view = new Uint8Array(arrayBuffer)
  view.set(data)
  
  const blob = new Blob([arrayBuffer], { type: 'video/mp4' })
  return new File([blob], outputName, { type: 'video/mp4' })
}

export function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith('video/')) {
    return 'El archivo debe ser un video'
  }

  if (file.size > MAX_VIDEO_SIZE) {
    return `El video supera los 100MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`
  }

  return null
}

export async function validateVideoDuration(file: File): Promise<string | null> {
  try {
    const duration = await getVideoDuration(file)
    if (duration > MAX_DURATION_SECONDS) {
      return `El video dura ${Math.round(duration)}s. Máximo permitido: ${MAX_DURATION_SECONDS}s (2 minutos)`
    }
    return null
  } catch {
    return 'No se pudo validar la duración del video'
  }
}
