interface EggSVGProps {
  color: string
  className?: string
  onClick?: () => void
  title?: string
}

export default function EggSVG({ color, className = "", onClick, title }: EggSVGProps) {
  return (
    <div 
      className={`group cursor-pointer ${className}`}
      onClick={onClick}
      title={title}
    >
      <svg 
        width="36" 
        height="48" 
        viewBox="0 0 30 40" 
        className="hover:drop-shadow-lg transition-all duration-300"
      >
        {/* Main egg shape */}
        <ellipse 
          cx="15" 
          cy="25" 
          rx="12" 
          ry="18" 
          fill={color} 
          stroke="#DDD" 
          strokeWidth="2" 
        />
        
        {/* Speckles */}
        <circle cx="10" cy="20" r="2" fill="#E6E6FA" opacity="0.7" />
        <circle cx="20" cy="15" r="1.5" fill="#E6E6FA" opacity="0.7" />
        <circle cx="12" cy="30" r="1" fill="#E6E6FA" opacity="0.7" />
        <circle cx="18" cy="28" r="1.2" fill="#E6E6FA" opacity="0.6" />
        
        {/* Highlight */}
        <ellipse cx="12" cy="18" rx="3" ry="6" fill="white" opacity="0.3" />
        
        {/* Hover effect */}
        <ellipse 
          cx="15" 
          cy="25" 
          rx="14" 
          ry="20" 
          fill="none" 
          stroke="#FFD700" 
          strokeWidth="1" 
          opacity="0" 
          className="group-hover:opacity-50 transition-opacity duration-300"
        />
      </svg>
    </div>
  )
}