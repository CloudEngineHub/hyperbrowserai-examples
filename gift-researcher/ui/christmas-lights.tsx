"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function ChristmasLights() {
  const [mounted, setMounted] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })

  useEffect(() => {
    setMounted(true)
    setDimensions({ width: window.innerWidth, height: window.innerHeight })
    
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!mounted) return null

  // Generate a strand of lights
  const lights = Array.from({ length: 25 })
  
  // Bezier Control Points
  // Start: (0, height) - Bottom Left
  // End: (width, 0) - Top Right
  // Control: (width * 0.4, height) - Pulls it down towards the bottom before going up
  const start = { x: 0, y: dimensions.height }
  const end = { x: dimensions.width, y: 0 }
  const control = { x: dimensions.width * 0.5, y: dimensions.height * 1.1 } // Sag below the screen bottom

  return (
    <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
      {/* Wire */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <path 
          d={`M${start.x},${start.y} Q${control.x},${control.y} ${end.x},${end.y}`} 
          fill="none" 
          stroke="#222" 
          strokeWidth="3" 
          opacity="0.8"
        />
      </svg>
      
      {/* Bulbs */}
      {lights.map((_, i) => (
        <LightBulb 
          key={i} 
          index={i} 
          total={lights.length} 
          start={start} 
          end={end} 
          control={control} 
        />
      ))}
    </div>
  )
}

function LightBulb({ 
  index, 
  total, 
  start, 
  end, 
  control 
}: { 
  index: number; 
  total: number; 
  start: {x: number, y: number}; 
  end: {x: number, y: number}; 
  control: {x: number, y: number}; 
}) {
  const colors = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"]
  const color = colors[index % colors.length]
  const delay = Math.random() * 2

  // Quadratic Bezier Calculation
  const t = (index + 1) / (total + 1) // Avoid 0 and 1 to keep bulbs off the very edges
  const invT = 1 - t
  
  const x = (invT * invT * start.x) + (2 * invT * t * control.x) + (t * t * end.x)
  const y = (invT * invT * start.y) + (2 * invT * t * control.y) + (t * t * end.y)

  // Calculate tangent angle for the socket to align with wire
  // Derivative of Quadratic Bezier: 2(1-t)(P1-P0) + 2t(P2-P1)
  const tx = 2 * invT * (control.x - start.x) + 2 * t * (end.x - control.x)
  const ty = 2 * invT * (control.y - start.y) + 2 * t * (end.y - control.y)
  const angle = Math.atan2(ty, tx) * (180 / Math.PI) + 90 // +90 to point downwards relative to wire
  
  // Random slight rotation for natural look (-15 to +15 degrees)
  // Use index to make it deterministic but "random" looking
  // Mix of straight hanging (physics) and chaotic twisted wires
  const randomSeed = (index * 7919) % 100;
  let randomTilt = 0;
  if (randomSeed > 30) { // 30% chance to be perfectly straight
     randomTilt = ((randomSeed % 30) - 15); // -15 to +15 range
  }

  return (
    <motion.div
      className="absolute"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, 0)', // Center horizontally, hang from top
        zIndex: Math.round(y) // Simple z-index based on y to interleave if needed, though they don't overlap much
      }}
    >
        <div className="flex flex-col items-center origin-top" style={{ transform: `rotate(${angle - 90}deg)` }}>
            {/* Socket - Rotates to follow wire */}
             <div className="w-2.5 h-3 bg-gray-900 rounded-sm z-10 shadow-sm" />
        </div>
        
        {/* Bulb - Hangs vertically with slight random tilt */}
        <div 
            className="flex flex-col items-center" 
            style={{ 
                marginTop: '-4px', 
                // Counter-rotate to hang mostly straight down (gravity) plus some wire twist
                transform: `rotate(${-(angle - 90) + randomTilt}deg)`
            }}
        >
             {/* Wire connection to bulb */}
             <div className="w-0.5 h-2 bg-gray-800" />

             {/* Bulb */}
            <motion.div
                animate={{
                    opacity: [0.7, 1, 0.7],
                    filter: [
                        `drop-shadow(0 0 8px ${color})`,
                        `drop-shadow(0 0 16px ${color})`,
                        `drop-shadow(0 0 8px ${color})`
                    ]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: delay,
                    ease: "easeInOut"
                }}
                className="w-5 h-7 rounded-full z-10 relative"
                style={{
                    backgroundColor: color,
                }}
            >
                 {/* Reflection highlight */}
                 <div className="absolute top-2 right-1.5 w-1.5 h-1.5 bg-white opacity-40 rounded-full" />
            </motion.div>
        </div>
    </motion.div>
  )
}
