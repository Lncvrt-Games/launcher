import { useEffect, useRef } from 'react'
import Image from 'next/image'
import BerryNoColor from '../assets/berries/BerryNoColor.png'

export default function RandomBerry () {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(document.createElement('img'))

  useEffect(() => {
    imgRef.current.src = BerryNoColor.src
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    canvas.width = 24
    canvas.height = 24

    let frame: number
    const frequency = 5

    const update = () => {
      const t = (performance.now() / 1000) * frequency

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i]
        const r = (Math.sin(t) * 0.5 + 0.5) * 255 * (gray / 255)
        const g = (Math.sin(t + 2) * 0.5 + 0.5) * 255 * (gray / 255)
        const b = (Math.sin(t + 4) * 0.5 + 0.5) * 255 * (gray / 255)
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
      }

      ctx.putImageData(imageData, 0, 0)
      frame = requestAnimationFrame(update)
    }

    imgRef.current.onload = () => update()
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvasRef} style={{ width: 24, height: 24 }} />
}
