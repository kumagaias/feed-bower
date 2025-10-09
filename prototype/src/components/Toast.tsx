'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  onClose: () => void
  duration?: number
  type?: 'success' | 'error' | 'warning'
}

export default function Toast({ message, onClose, duration = 5000, type = 'warning' }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: '#14b8a6', // primary color
          text: 'white',
          border: '#0d9488'
        }
      case 'error':
        return {
          bg: '#ef4444',
          text: 'white',
          border: '#dc2626'
        }
      default:
        return {
          bg: '#eab308',
          text: '#1f2937',
          border: '#ca8a04'
        }
    }
  }

  const styles = getStyles()

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-slide-down">
      <div 
        className="px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md border-2"
        style={{
          backgroundColor: styles.bg,
          color: styles.text,
          borderColor: styles.border
        }}
      >
        <div className="flex-1 font-medium">
          {message}
        </div>
        <button
          onClick={onClose}
          className="hover:opacity-75 transition-opacity text-xl font-bold leading-none"
          style={{ color: styles.text }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
