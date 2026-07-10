"use client"

import Image, { type ImageProps } from "next/image"

interface LogoContainerProps {
  src: string
  alt: string
  size: "sm" | "md" | "lg"
  className?: string
  width: number
  height: number
}

const sizeStyles = {
  sm: "p-1 rounded-lg shadow-sm",
  md: "p-1 rounded-xl shadow-sm",
  lg: "p-1 rounded-md",
}

export function LogoContainer({
  src,
  alt,
  size,
  className = "",
  width,
  height,
}: LogoContainerProps) {
  return (
    <div
      className={`bg-white inline-flex items-center justify-center ${sizeStyles[size]} ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="object-contain"
      />
    </div>
  )
}
