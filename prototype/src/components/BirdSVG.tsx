'use client'

interface BirdSVGProps {
  className?: string
  onClick?: () => void
}

export default function BirdSVG({ className = '', onClick }: BirdSVGProps) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Bird body */}
      <ellipse cx="20" cy="22" rx="8" ry="6" fill="#FFD700" />
      
      {/* Bird head */}
      <circle cx="20" cy="16" r="5" fill="#FFD700" />
      
      {/* Eye */}
      <circle cx="22" cy="15" r="1.5" fill="#000" />
      
      {/* Beak */}
      <path d="M 25 16 L 28 15 L 25 14 Z" fill="#FF6B35" />
      
      {/* Left wing - animated */}
      <g className="wing-left">
        <path
          d="M 12 20 Q 8 18 6 22 Q 8 24 12 23 Z"
          fill="#FFA500"
        />
      </g>
      
      {/* Right wing - animated */}
      <g className="wing-right">
        <path
          d="M 28 20 Q 32 18 34 22 Q 32 24 28 23 Z"
          fill="#FFA500"
        />
      </g>
      
      {/* Tail */}
      <path d="M 14 26 Q 10 28 12 30 L 16 27 Z" fill="#FFA500" />
      
      <style jsx>{`
        .wing-left {
          animation: flapLeft 0.4s ease-in-out infinite;
          transform-origin: 12px 22px;
        }
        
        .wing-right {
          animation: flapRight 0.4s ease-in-out infinite;
          transform-origin: 28px 22px;
        }
        
        @keyframes flapLeft {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(-25deg);
          }
        }
        
        @keyframes flapRight {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(25deg);
          }
        }
      `}</style>
    </svg>
  )
}
