'use client'

import * as React from 'react'
import { Waves } from '@/components/ui/wave-background'

export function WavesDemo() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black">
      <div className="flex w-full flex-col items-center">
        <div className="h-px w-full bg-white/80" />
        <div className="relative aspect-video w-full">
          <Waves className="h-full w-full" />
        </div>
        <div className="h-px w-full bg-white/80" />
      </div>
    </div>
  )
}
