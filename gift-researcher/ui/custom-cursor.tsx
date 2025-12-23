"use client"

import { useEffect, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { Gift } from "lucide-react"

export function CustomCursor() {
  const [mounted, setMounted] = useState(false)
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  
  const springConfig = { damping: 25, stiffness: 700 }
  const cursorXSpring = useSpring(cursorX, springConfig)
  const cursorYSpring = useSpring(cursorY, springConfig)

  useEffect(() => {
    setMounted(true)
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }
    window.addEventListener("mousemove", moveCursor)
    return () => {
      window.removeEventListener("mousemove", moveCursor)
    }
  }, [cursorX, cursorY])

  if (!mounted) return null

  // Hide default cursor on body via global CSS or inline styles in layout
  
  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[100] text-white mix-blend-difference"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
        translateX: "-50%",
        translateY: "-50%"
      }}
    >
      <div className="relative">
        {/* Glow */}
        <div className="absolute inset-0 bg-white blur-xl opacity-40 rounded-full scale-150" />
        {/* Icon */}
        <Gift className="w-8 h-8 text-[#f1f1f1]" />
        {/* Trail particles could be added here */}
      </div>
    </motion.div>
  )
}

