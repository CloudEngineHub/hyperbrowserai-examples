"use client"

import React, { useRef, useEffect } from "react"

type Cursor = {
  radius: number
  x?: number
  y?: number
}

const SnowflakePatternMap = {
  Dot: 0,
  Branches: 1,
  Spearheads: 2,
  Asterisk: 3,
} as const

type SnowflakePattern = (typeof SnowflakePatternMap)[keyof typeof SnowflakePatternMap]

export function InteractiveSnowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursor = useRef<Cursor>({ radius: 80 })
  const frameRef = useRef(0)
  const snowflakes = useRef<Snowflake[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Initialize Sprites
    const sprites: SnowflakeSprite[] = []
    for (let s = 0; s <= 3; ++s) {
      sprites.push(new SnowflakeSprite(s as SnowflakePattern))
    }

    const getCanvas = () => {
      const { devicePixelRatio } = window
      // Ensure canvas is attached to DOM
      const width = canvas.width / devicePixelRatio
      const height = canvas.height / devicePixelRatio
      return { width, height }
    }

    const createSnowflakes = () => {
      const { width, height } = getCanvas()
      const snowflakesMin = Math.round((width * height) / 6000) // Much reduced density
      const snowflakesMax = 150
      const snowflakeCount = Math.min(snowflakesMin, snowflakesMax)
      const radiusMin = 2
      const radiusMax = 6 // Slightly smaller flakes

      snowflakes.current = []

      for (let i = 0; i < snowflakeCount; i++) {
        const radius = Utils.random(radiusMin, radiusMax)
        const pattern = Math.round(Utils.random(0, 3)) as SnowflakePattern
        const snowflake = new Snowflake(
          width,
          height,
          radius,
          sprites[pattern].canvas
        )
        snowflakes.current.push(snowflake)
      }
    }

    const animate = () => {
      const { width, height } = getCanvas()

      ctx.clearRect(0, 0, width, height)
      ctx.globalAlpha = 0.6 // Slightly more transparent

      snowflakes.current.forEach((flake) => {
        flake.update(cursor.current, width, height)
        flake.draw(ctx)
      })
      frameRef.current = requestAnimationFrame(animate)
    }

    const handleDown = (e: Event) => {
      const event = e as PointerEvent
      cursor.current.x = event.clientX
      cursor.current.y = event.clientY
    }

    const handleUp = () => {
      const radius = cursor.current.radius
      cursor.current.x = -radius
      cursor.current.y = -radius
    }

    const resize = () => {
      const { devicePixelRatio, innerWidth, innerHeight } = window

      canvas.width = innerWidth * devicePixelRatio
      canvas.height = innerHeight * devicePixelRatio
      canvas.style.width = innerWidth + "px"
      canvas.style.height = innerHeight + "px"
      
      // Reset context state after resize
      ctx.scale(devicePixelRatio, devicePixelRatio)
      
      createSnowflakes()
    }

    // Initial Setup
    resize()
    animate()

    window.addEventListener("resize", resize)
    const eventMap = {
      pointerdown: handleDown,
      pointermove: handleDown,
      pointerout: handleUp,
      pointerup: handleUp,
    }
    const eventMapEntries = Object.entries(eventMap)

    eventMapEntries.forEach(([event, handler]) => {
      canvas.addEventListener(event, handler)
    })

    return () => {
      window.removeEventListener("resize", resize)
      eventMapEntries.forEach(([event, handler]) => {
        canvas.removeEventListener(event, handler)
      })
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 mix-blend-screen opacity-70"
      aria-label="Interactive snowfall"
    />
  )
}

class Snowflake {
  private x: number
  private y: number
  private rotation = Utils.random(0, Math.PI)
  private readonly density = 50
  private readonly pattern: HTMLCanvasElement
  private readonly radius: number
  private readonly rotationSpeed = Utils.random(-0.02, 0.02)
  private readonly speedX = Utils.random(-0.5, 0.5)
  private readonly speedY = Utils.random(1.5, 4) // Slightly slower fall

  constructor(
    width: number,
    height: number,
    radius: number,
    pattern: HTMLCanvasElement
  ) {
    this.x = Utils.random(0, width)
    this.y = Utils.random(0, height)
    this.radius = radius
    this.pattern = pattern
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    ctx.drawImage(
      this.pattern,
      -this.radius,
      -this.radius,
      this.radius * 2,
      this.radius * 2
    )
    ctx.restore()
  }

  update(cursor: Cursor, width: number, height: number): void {
    this.x += this.speedX
    this.y += this.speedY
    this.rotation += this.rotationSpeed
    this.rotation %= 2 * Math.PI

    const dx = (cursor.x ?? -cursor.radius) - this.x
    const dy = (cursor.y ?? -cursor.radius) - this.y
    const distance = Math.hypot(dx, dy)

    if (distance < cursor.radius) {
      const forceDirectionX = dx / distance
      const forceDirectionY = dy / distance
      const force = (cursor.radius - distance) / cursor.radius
      const directionX = forceDirectionX * force * this.density
      const directionY = forceDirectionY * force * this.density

      this.x -= directionX
      this.y -= directionY
    }

    const outsideLeft = this.x < -cursor.radius
    const outsideRight = this.x > width + cursor.radius
    const outsideBottom = this.y > height + cursor.radius

    if (outsideLeft || outsideRight || outsideBottom) {
      this.x = Utils.random(0, width)
      this.y = -this.radius
    }
  }
}

class SnowflakeSprite {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly patternType: SnowflakePattern
  private readonly lineWidth = 1
  private readonly radius = 10

  constructor(patternIndex: SnowflakePattern) {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")
    this.patternType = patternIndex

    const { devicePixelRatio } = window
    const size = this.radius * 2 * devicePixelRatio

    this.canvas.width = size
    this.canvas.height = size

    if (this.ctx) {
      // Warm white color for the Christmas theme
      const color = "rgba(255, 248, 240, 0.9)" 

      this.ctx.fillStyle = color
      this.ctx.strokeStyle = color
      this.ctx.lineCap = "round"
      this.ctx.lineJoin = "round"
      this.ctx.lineWidth = this.lineWidth
      this.ctx.scale(devicePixelRatio, devicePixelRatio)
      this.drawPattern()
    }
  }

  private drawPattern(): void {
    this.ctx?.save()
    this.ctx?.translate(this.radius, this.radius)

    if (this.patternType === SnowflakePatternMap.Dot) {
      this.drawDot()
      return
    }
    const sectors = 6

    for (let i = 0; i < sectors; i++) {
      this.ctx?.rotate(Math.PI / (sectors / 2))

      switch (this.patternType) {
        case SnowflakePatternMap.Branches:
          this.drawBranch()
          break
        case SnowflakePatternMap.Spearheads:
          this.drawSpearhead()
          break
        default:
          this.drawAsteriskStroke()
      }
    }
    this.ctx?.restore()
  }

  private drawAsteriskStroke(): void {
    const adjustedRadius = this.radius - 1
    this.ctx?.beginPath()
    this.ctx?.moveTo(0, 0)
    this.ctx?.lineTo(0, adjustedRadius)
    this.ctx?.closePath()
    this.ctx?.stroke()
  }

  private drawBranch(): void {
    const adjustedRadius = this.radius - 0.5
    const spurPos = -adjustedRadius * 0.5
    const spurLength = adjustedRadius * 0.35
    this.ctx?.beginPath()
    this.ctx?.moveTo(0, 0)
    this.ctx?.lineTo(0, -adjustedRadius)
    this.ctx?.moveTo(0, spurPos)
    this.ctx?.lineTo(-spurLength, spurPos - spurLength)
    this.ctx?.moveTo(0, spurPos)
    this.ctx?.lineTo(spurLength, spurPos - spurLength)
    this.ctx?.closePath()
    this.ctx?.stroke()
  }

  private drawDot(): void {
    this.ctx?.beginPath()
    this.ctx?.arc(0, 0, this.radius / 2, 0, Math.PI * 2)
    this.ctx?.closePath()
    this.ctx?.fill()
  }

  private drawSpearhead(): void {
    const adjustedRadius = this.radius - 0.5
    const headStart = -adjustedRadius * 0.6
    const headEnd = -adjustedRadius
    const headWidth = adjustedRadius * 0.2
    this.ctx?.beginPath()
    this.ctx?.moveTo(0, 0)
    this.ctx?.lineTo(0, -adjustedRadius * 0.5)
    this.ctx?.moveTo(0, headEnd)
    this.ctx?.lineTo(-headWidth, headStart)
    this.ctx?.lineTo(0, headStart + adjustedRadius * 0.1)
    this.ctx?.lineTo(headWidth, headStart)
    this.ctx?.closePath()
    this.ctx?.stroke()
    this.ctx?.fill()
  }
}

class Utils {
  static random(min: number = 0, max: number = 1) {
    const value = Math.random() // Using Math.random for performance in high-freq animation
    return min + value * (max - min)
  }
}

