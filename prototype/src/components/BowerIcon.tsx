'use client'

interface BowerIconProps {
  eggColors?: string[]
  size?: number
  className?: string
}

export default function BowerIcon({ eggColors = [], size = 48, className = '' }: BowerIconProps) {
  // Default nest color
  const nestColor = '#8B4513'
  
  // If no egg colors provided, show empty nest
  if (eggColors.length === 0) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Nest */}
        <ellipse cx="50" cy="70" rx="40" ry="15" fill={nestColor} opacity="0.8" />
        <ellipse cx="50" cy="65" rx="38" ry="13" fill={nestColor} opacity="0.6" />
        <ellipse cx="50" cy="60" rx="35" ry="12" fill={nestColor} opacity="0.9" />
      </svg>
    )
  }

  // Calculate egg positions based on number of eggs
  const getEggPositions = (count: number) => {
    if (count === 1) return [{ x: 50, y: 55, scale: 1.6 }]
    if (count === 2) return [
      { x: 40, y: 55, scale: 1.4 },
      { x: 60, y: 55, scale: 1.4 }
    ]
    if (count === 3) return [
      { x: 35, y: 58, scale: 1.2 },
      { x: 50, y: 52, scale: 1.25 },
      { x: 65, y: 58, scale: 1.2 }
    ]
    if (count === 4) return [
      { x: 35, y: 58, scale: 1.1 },
      { x: 50, y: 50, scale: 1.15 },
      { x: 65, y: 58, scale: 1.1 },
      { x: 50, y: 62, scale: 1.05 }
    ]
    // For 5+ eggs, arrange in a cluster
    return [
      { x: 32, y: 58, scale: 1.0 },
      { x: 50, y: 48, scale: 1.05 },
      { x: 68, y: 58, scale: 1.0 },
      { x: 40, y: 63, scale: 0.95 },
      { x: 60, y: 63, scale: 0.95 },
      { x: 50, y: 66, scale: 0.9 },
      { x: 35, y: 52, scale: 0.9 },
      { x: 65, y: 52, scale: 0.9 }
    ].slice(0, Math.min(count, 8))
  }

  const eggPositions = getEggPositions(eggColors.length)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Nest */}
      <ellipse cx="50" cy="70" rx="40" ry="15" fill={nestColor} opacity="0.8" />
      <ellipse cx="50" cy="65" rx="38" ry="13" fill={nestColor} opacity="0.6" />
      <ellipse cx="50" cy="60" rx="35" ry="12" fill={nestColor} opacity="0.9" />
      
      {/* Eggs */}
      {eggColors.map((color, index) => {
        const pos = eggPositions[index]
        if (!pos) return null
        
        const eggWidth = 12 * pos.scale
        const eggHeight = 16 * pos.scale
        
        return (
          <g key={index}>
            {/* Egg shadow */}
            <ellipse
              cx={pos.x}
              cy={pos.y + 2}
              rx={eggWidth * 0.5}
              ry={eggHeight * 0.5}
              fill="black"
              opacity="0.2"
            />
            {/* Egg */}
            <ellipse
              cx={pos.x}
              cy={pos.y}
              rx={eggWidth * 0.5}
              ry={eggHeight * 0.5}
              fill={color}
              stroke="white"
              strokeWidth="1"
              opacity="0.95"
            />
            {/* Egg highlight */}
            <ellipse
              cx={pos.x - 2}
              cy={pos.y - 2}
              rx={eggWidth * 0.25}
              ry={eggHeight * 0.25}
              fill="white"
              opacity="0.5"
            />
          </g>
        )
      })}
    </svg>
  )
}
