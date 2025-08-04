import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    expect(screen.getByText('Todoist Drag & Drop Calendar')).toBeInTheDocument()
  })

  it('shows build system test message', () => {
    render(<App />)
    expect(screen.getByText('Build system test - everything is working!')).toBeInTheDocument()
  })
})