'use client'

import { useEffect } from 'react'
import { colors } from '@/styles/colors'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'warning'
  onClose: () => void
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: 'white',
          color: colors.primary,
          borderColor: colors.primary
        }
      case 'error':
        return {
          backgroundColor: 'white',
          color: '#ef4444', // red-500
          borderColor: '#ef4444'
        }
      case 'warning':
        return {
          backgroundColor: 'white',
          color: '#f59e0b', // yellow-500
          borderColor: '#f59e0b'
        }
      default:
        return {
          backgroundColor: 'white',
          color: colors.primary,
          borderColor: colors.primary
        }
    }
  }

  const toastStyle = getToastStyle()

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div 
        className="px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[300px] justify-center border-2"
        style={{
          backgroundColor: toastStyle.backgroundColor,
          color: toastStyle.color,
          borderColor: toastStyle.borderColor
        }}
      >
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="hover:opacity-75 ml-2 text-lg"
          style={{ color: toastStyle.color }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}