'use client'

interface BalloonSVGProps {
  className?: string
  onClick?: () => void
  color?: string
}

export default function BalloonSVG({ className = '', onClick, color = '#FF6B9D' }: BalloonSVGProps) {
  return (
    <svg
      width="70"
      height="100"
      viewBox="0 0 35 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Balloon body */}
      <ellipse cx="17.5" cy="15" rx="12" ry="15" fill={color} />
      
      {/* Highlight */}
      <ellipse cx="14" cy="10" rx="4" ry="5" fill="white" opacity="0.4" />
      
      {/* Balloon knot */}
      <path
        d="M 17.5 30 Q 16 32 17.5 33 Q 19 32 17.5 30 Z"
        fill={color}
        opacity="0.8"
      />
      
      {/* String */}
      <path
        d="M 17.5 33 Q 16 38 17.5 43 Q 19 38 17.5 33"
        stroke="#999"
        strokeWidth="0.5"
        fill="none"
        className="string"
      />
      
      <style jsx>{`
        .string {
          animation: stringWave 2s ease-in-out infinite;
        }
        
        @keyframes stringWave {
          0%, 100% {
            d: path("M 17.5 33 Q 16 38 17.5 43 Q 19 38 17.5 33");
          }
          50% {
            d: path("M 17.5 33 Q 19 38 17.5 43 Q 16 38 17.5 33");
          }
        }
      `}</style>
    </svg>
  )
}
