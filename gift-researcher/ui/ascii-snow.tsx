"use client"

import { useEffect, useRef } from "react"

export function AsciiSnow() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let particles: { x: number; y: number; speed: number; char: string; opacity: number }[] = []

    // Enhanced character set with snowflakes
    const chars = ["*", "+", ".", "x", "o", "'", "`", "❄", "❅", "❆", "⋆", "•"]

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    const initParticles = () => {
      // Increased density for visibility
      const particleCount = Math.min(window.innerWidth / 5, 200) 
      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: Math.random() * 0.5 + 0.1,
          char: chars[Math.floor(Math.random() * chars.length)],
          opacity: Math.random() * 0.4 + 0.1, // Adjusted opacity range
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = "14px monospace" // Slightly larger font
      
      particles.forEach((p) => {
        // Gold/Warm White for christmas vibe
        ctx.fillStyle = `rgba(255, 241, 220, ${p.opacity})` 
        ctx.fillText(p.char, p.x, p.y)

        // Update position
        p.y += p.speed
        
        // Reset if out of bounds
        if (p.y > canvas.height) {
          p.y = -20
          p.x = Math.random() * canvas.width
          p.char = chars[Math.floor(Math.random() * chars.length)]
        }
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    // Initialize
    resize()
    window.addEventListener("resize", resize)
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }} // Increased overall opacity
    />
  )
}
