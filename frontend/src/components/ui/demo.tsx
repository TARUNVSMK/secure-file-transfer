'use client'

import { useEffect, useState } from 'react'
import { SpiralAnimation } from '@/components/ui/spiral-animation'

const SpiralDemo = () => {
  const [startVisible, setStartVisible] = useState(false)

  const enterWorkspace = () => {
    window.location.hash = 'works'
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStartVisible(true)
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="landing-page">
      <div className="landing-animation-layer">
        <SpiralAnimation />
      </div>

      <div className={`landing-enter-shell ${startVisible ? 'is-visible' : ''}`}>
        <button
          type="button"
          onClick={enterWorkspace}
          className="landing-enter-button"
          aria-label="Enter workspace"
        >
          <span className="landing-enter-button__label">Enter</span>
        </button>
      </div>
    </div>
  )
}

export { SpiralDemo }
