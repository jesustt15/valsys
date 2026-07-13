import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { DocumentScanner } from '@/components/ui/document-scanner'

// Mock react-webcam to trigger onUserMediaError for error flow tests
vi.mock('react-webcam', () => {
  const React = require('react')
  const MockWebcam = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => 'data:image/jpeg;base64,mock123',
    }))
    // Fire onUserMediaError immediately to simulate camera failure
    React.useEffect(() => {
      if (props.onUserMediaError) {
        props.onUserMediaError()
      }
    }, [props.onUserMediaError])
    return React.createElement('div', { 'data-testid': 'mock-webcam' })
  })
  MockWebcam.displayName = 'MockWebcam'
  return { __esModule: true, default: MockWebcam }
})

// Mock jsPDF
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    addImage: vi.fn(),
    output: vi.fn().mockReturnValue(new Blob(['mock-pdf'], { type: 'application/pdf' })),
  })),
}))

// Mock HTMLCanvasElement.getContext for crop operations
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(100 * 100 * 4),
  })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(842 * 595 * 4),
  })),
})) as any

// Mock Image constructor — jsdom's Image doesn't fire onload for data URLs
class MockImage {
  onload: (() => void) | null = null
  width = 800
  height = 600
  private _src = ''

  set src(value: string) {
    this._src = value
    // Fire onload on next tick to simulate async image loading
    setTimeout(() => this.onload?.(), 0)
  }
  get src() {
    return this._src
  }
}
vi.stubGlobal('Image', MockImage)

describe('DocumentScanner — error & gallery fallback', () => {
  const defaultProps = {
    label: 'Test Scanner',
    onCapture: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error UI when camera fails (task 4.2)', async () => {
    // Desktop (no touch points)
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0, configurable: true, writable: true,
    })

    render(<DocumentScanner {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/No se pudo acceder a la cámara/)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('shows gallery fallback after 2 errors on mobile (task 4.2)', async () => {
    // Set mobile
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5, configurable: true, writable: true,
    })

    const { rerender } = render(<DocumentScanner {...defaultProps} />)

    // First error — only retry, no gallery
    await waitFor(() => {
      expect(screen.getByText(/No se pudo acceder a la cámara/)).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /subir desde galería/i })).not.toBeInTheDocument()

    // Click retry → handleRetry resets cameraError, increments webcamKey
    // The mock webcam fires onUserMediaError again (second error)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    })

    // Gallery button should appear after second error (mobile)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /subir desde galería/i })).toBeInTheDocument()
    })
  })

  it('gallery button is hidden on desktop even after multiple errors', async () => {
    // Desktop
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0, configurable: true, writable: true,
    })

    render(<DocumentScanner {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/No se pudo acceder a la cámara/)).toBeInTheDocument()
    })

    // Retry (second error)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    })

    // Gallery button should NOT appear on desktop
    expect(screen.queryByRole('button', { name: /subir desde galería/i })).not.toBeInTheDocument()
  })
})

describe('DocumentScanner — gallery file select (task 4.3)', () => {
  const defaultProps = {
    label: 'Test Scanner',
    onCapture: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Set mobile
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5, configurable: true, writable: true,
    })
  })

  it('transitions to adjust step after selecting a gallery image', async () => {
    render(<DocumentScanner {...defaultProps} />)

    // First error
    await waitFor(() => {
      expect(screen.getByText(/No se pudo acceder a la cámara/)).toBeInTheDocument()
    })

    // Retry → second error → gallery button appears
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /subir desde galería/i })).toBeInTheDocument()
    })

    // Prepare file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()

    const mockFile = new File(['fake-image-content'], 'test.jpg', { type: 'image/jpeg' })

    // Mock FileReader — triggers onload after readAsDataURL
    const originalFileReader = global.FileReader

    class MockFileReader {
      result: string = 'data:image/jpeg;base64,fakeResult'
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      readAsDataURL(_file: File) {
        // Simulate async read — fire onload on next tick
        setTimeout(() => {
          this.onload?.()
        }, 0)
      }
    }

    vi.stubGlobal('FileReader', MockFileReader)

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      })
      fireEvent.change(fileInput)
    })

    // The component should now be in 'adjust' step after FileReader.onload fires
    await waitFor(() => {
      expect(screen.getByText(/Ajustar esquinas/)).toBeInTheDocument()
    })

    // Restore original FileReader
    vi.stubGlobal('FileReader', originalFileReader)
  })
})
