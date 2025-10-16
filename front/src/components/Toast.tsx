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
          backgroundColor: colors.primary,
          color: 'white'
        }
      case 'error':
        return {
          backgroundColor: '#ef4444', // red-500
          color: 'white'
        }
      case 'warning':
        return {
          backgroundColor: '#f59e0b', // yellow-500
          color: 'white'
        }
      default:
        return {
          backgroundColor: colors.primary,
          color: 'white'
        }
    }
  }

  const toastStyle = getToastStyle()

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div 
        className="px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[300px] justify-center"
        style={toastStyle}
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