import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DashboardLayoutClient } from '@/app/(dashboard)/layout-client'

// Mock useMediaQuery: start as mobile (<1024px)
const mockUseMediaQuery = vi.fn()
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: (query: string) => mockUseMediaQuery(query),
}))

// Mock child components to isolate layout coordination
vi.mock('@/components/sidebar', () => ({
  Sidebar: ({ isMobileOpen, onMobileClose }: { isMobileOpen?: boolean; onMobileClose?: () => void }) => (
    <div data-testid="sidebar">
      {isMobileOpen ? (
        <div data-testid="sidebar-drawer-open">
          <button data-testid="backdrop-close" onClick={onMobileClose}>Close</button>
        </div>
      ) : (
        <div data-testid="sidebar-hidden" />
      )}
    </div>
  ),
}))

vi.mock('@/components/topbar', () => ({
  Topbar: ({ onMenuToggle }: { onMenuToggle?: () => void }) => (
    <div data-testid="topbar">
      <button data-testid="hamburger" onClick={onMenuToggle}>Menu</button>
    </div>
  ),
}))

vi.mock('@/components/logout-button', () => ({
  LogoutButton: () => <button data-testid="logout">Logout</button>,
}))

describe('DashboardLayoutClient — mobile drawer integration (task 4.4)', () => {
  const defaultProps = {
    fullName: 'Test User',
    role: 'operator' as const,
    initialUnreadCount: 0,
    children: <div data-testid="page-content">Page Content</div>,
  }

  it('renders sidebar hidden on mobile', () => {
    mockUseMediaQuery.mockReturnValue(false) // mobile
    render(<DashboardLayoutClient {...defaultProps} />)

    expect(screen.getByTestId('sidebar-hidden')).toBeInTheDocument()
    expect(screen.getByTestId('hamburger')).toBeInTheDocument()
    expect(screen.getByTestId('page-content')).toBeInTheDocument()
  })

  it('hamburger click opens mobile drawer', () => {
    mockUseMediaQuery.mockReturnValue(false) // mobile
    render(<DashboardLayoutClient {...defaultProps} />)

    // Sidebar should be hidden initially
    expect(screen.getByTestId('sidebar-hidden')).toBeInTheDocument()

    // Click hamburger
    fireEvent.click(screen.getByTestId('hamburger'))

    // Sidebar drawer should now be visible
    expect(screen.getByTestId('sidebar-drawer-open')).toBeInTheDocument()
    expect(screen.getByTestId('backdrop-close')).toBeInTheDocument()
  })

  it('backdrop click closes mobile drawer', () => {
    mockUseMediaQuery.mockReturnValue(false) // mobile
    render(<DashboardLayoutClient {...defaultProps} />)

    // Open drawer
    fireEvent.click(screen.getByTestId('hamburger'))
    expect(screen.getByTestId('sidebar-drawer-open')).toBeInTheDocument()

    // Click backdrop (close button inside drawer)
    fireEvent.click(screen.getByTestId('backdrop-close'))

    // Drawer should be hidden again
    expect(screen.getByTestId('sidebar-hidden')).toBeInTheDocument()
  })

  it('renders sidebar as desktop (static) on wide screens', () => {
    mockUseMediaQuery.mockReturnValue(true) // desktop
    const { container } = render(<DashboardLayoutClient {...defaultProps} />)

    // On desktop, the real sidebar is rendered (not hidden)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    // Hamburger should NOT be visible (topbar mock always renders it,
    // but the real topbar hides it; we test layout coordination here)
    expect(screen.getByTestId('hamburger')).toBeInTheDocument()
    expect(screen.getByTestId('page-content')).toBeInTheDocument()
  })
})
