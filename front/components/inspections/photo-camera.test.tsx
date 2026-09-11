import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { PhotoCamera } from '@/components/inspections/photo-camera'

// ─── Controllable react-webcam mock ─────────────────────────────────────────
// Module-level control: each test sets `webcamMode` before rendering.
//   'idle'  → no callback fired (loading state persists)
//   'ready' → fires onUserMedia on mount
//   'error' → fires onUserMediaError on mount
let webcamMode: 'idle' | 'ready' | 'error' = 'idle'

// Mock screenshot payload — a tiny valid JPEG data URL for atob/File conversion
const MOCK_SCREENSHOT = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

vi.mock('react-webcam', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- vi.mock factory requires sync import
  const React = require('react')
  const MockWebcam = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => MOCK_SCREENSHOT,
    }))
    /* eslint-disable react-hooks/exhaustive-deps -- fire once per mount; callbacks are stable via parent useCallback */
    React.useEffect(() => {
      if (webcamMode === 'ready' && typeof props.onUserMedia === 'function') {
        ;(props.onUserMedia as () => void)()
      }
      if (webcamMode === 'error' && typeof props.onUserMediaError === 'function') {
        ;(props.onUserMediaError as () => void)()
      }
    }, [])
    /* eslint-enable react-hooks/exhaustive-deps */
    return React.createElement('div', { 'data-testid': 'mock-webcam' })
  })
  MockWebcam.displayName = 'MockWebcam'
  return { __esModule: true, default: MockWebcam }
})

// ─── Helpers ────────────────────────────────────────────────────────────────
const defaultProps = {
  maxPhotos: 5,
  onPhotos: vi.fn(),
  onClose: vi.fn(),
  onFallback: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  webcamMode = 'idle'
})

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PhotoCamera — loading state', () => {
  it('shows loading spinner while camera initializes', () => {
    webcamMode = 'idle'
    render(<PhotoCamera {...defaultProps} />)

    expect(screen.getByText(/Iniciando cámara/)).toBeInTheDocument()
    expect(screen.getByTestId('mock-webcam')).toBeInTheDocument()
  })
})

describe('PhotoCamera — ready & capture flow', () => {
  it('transitions to live camera on successful user media', async () => {
    webcamMode = 'ready'
    render(<PhotoCamera {...defaultProps} />)

    // Loading spinner disappears, camera controls appear
    await waitFor(() => {
      expect(screen.queryByText(/Iniciando cámara/)).not.toBeInTheDocument()
    })

    // Shutter and Listo buttons visible
    expect(screen.getByRole('button', { name: /tomar foto/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /listo/i })).toBeInTheDocument()
  })

  it('shutter capture adds a thumbnail and counter; "Listo" delivers files', async () => {
    webcamMode = 'ready'
    render(<PhotoCamera {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tomar foto/i })).toBeInTheDocument()
    })

    // Click shutter
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tomar foto/i }))
    })

    // Counter should show 1 / 5
    await waitFor(() => {
      expect(screen.getByText('1 / 5')).toBeInTheDocument()
    })

    // Thumbnail should appear
    expect(screen.getByAltText('Foto 1')).toBeInTheDocument()

    // Click shutter again
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tomar foto/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('2 / 5')).toBeInTheDocument()
    })

    // Click "Listo"
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /listo/i }))
    })

    // onPhotos called with 2 File objects, then onClose
    expect(defaultProps.onPhotos).toHaveBeenCalledTimes(1)
    const deliveredFiles = defaultProps.onPhotos.mock.calls[0][0] as File[]
    expect(deliveredFiles).toHaveLength(2)
    expect(deliveredFiles[0]).toBeInstanceOf(File)
    expect(deliveredFiles[0].type).toBe('image/jpeg')
    expect(deliveredFiles[0].name).toMatch(/^foto_\d+\.jpg$/)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})

describe('PhotoCamera — error state', () => {
  it('shows error UI with retry and fallback buttons on user media error', async () => {
    webcamMode = 'error'
    render(<PhotoCamera {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/No se pudo acceder a la cámara/)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /usar cámara del sistema/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^cerrar$/i })).toBeInTheDocument()
  })

  it('clicking "Usar cámara del sistema" calls onFallback', async () => {
    webcamMode = 'error'
    render(<PhotoCamera {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /usar cámara del sistema/i })).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /usar cámara del sistema/i }))
    })

    expect(defaultProps.onFallback).toHaveBeenCalledTimes(1)
  })

  it('"Cerrar" in error state delivers captured photos then closes', async () => {
    webcamMode = 'error'
    render(<PhotoCamera {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^cerrar$/i })).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^cerrar$/i }))
    })

    // No photos captured yet → delivers empty array
    expect(defaultProps.onPhotos).toHaveBeenCalledWith([])
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})

describe('PhotoCamera — shutter disabled conditions', () => {
  it('shutter is disabled while stream is not ready', () => {
    webcamMode = 'idle'
    render(<PhotoCamera {...defaultProps} />)

    const shutter = screen.getByRole('button', { name: /tomar foto/i })
    expect(shutter).toBeDisabled()
  })

  it('shutter is disabled when maxPhotos is reached', async () => {
    webcamMode = 'ready'
    // maxPhotos = 1: first shot fills the quota
    render(<PhotoCamera {...defaultProps} maxPhotos={1} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tomar foto/i })).toBeInTheDocument()
    })

    // Take one shot
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tomar foto/i }))
    })

    // Shutter should now be disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tomar foto/i })).toBeDisabled()
    })

    // Hint text visible
    expect(screen.getByText(/Máximo alcanzado/)).toBeInTheDocument()
  })
})

describe('PhotoCamera — X button delivers photos', () => {
  it('closing via X delivers any captured photos', async () => {
    webcamMode = 'ready'
    render(<PhotoCamera {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tomar foto/i })).toBeInTheDocument()
    })

    // Take one shot
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tomar foto/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('1 / 5')).toBeInTheDocument()
    })

    // Close via X
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cerrar y guardar/i }))
    })

    expect(defaultProps.onPhotos).toHaveBeenCalledTimes(1)
    const deliveredFiles = defaultProps.onPhotos.mock.calls[0][0] as File[]
    expect(deliveredFiles).toHaveLength(1)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
