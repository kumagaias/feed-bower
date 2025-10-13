'use client'

export default function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Hatching Egg Animation */}
      <div className="relative mb-6">
        <div className="text-6xl animate-bounce">
          🥚
        </div>
        <div className="absolute top-0 left-0 text-6xl animate-hatch">
          🐣
        </div>
      </div>
      
      {/* Loading Text with Gradient Animation */}
      <div className="text-2xl font-bold">
        <span 
          className="inline-block animate-gradient-text bg-clip-text text-transparent bg-[length:200%_auto]"
          style={{ 
            backgroundImage: `linear-gradient(to right, var(--color-primary), var(--color-accent), var(--color-primary))`
          }}
        >
          Loading...
        </span>
      </div>
    </div>
  )
}