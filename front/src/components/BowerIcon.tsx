'use client'

interface BowerIconProps {
  bower: any
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function BowerIcon({ bower, size = 'md', className = '' }: BowerIconProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-2xl',
    md: 'w-12 h-12 text-3xl',
    lg: 'w-16 h-16 text-4xl'
  }

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${className}`}
      style={{ backgroundColor: bower.color || '#14b8a6' }}
    >
      <span className="text-white">🪺</span>
    </div>
  )
}