let popAudioContext
let gearAudioContext

export function playPopSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  popAudioContext ??= new AudioContext()

  const startSound = () => {
    const now = popAudioContext.currentTime
    const osc = popAudioContext.createOscillator()
    const gain = popAudioContext.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08)
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
    osc.connect(gain)
    gain.connect(popAudioContext.destination)
    osc.start(now)
    osc.stop(now + 0.08)
  }

  if (popAudioContext.state === 'suspended') popAudioContext.resume().then(startSound).catch(() => {})
  else startSound()
}

export function playGearRotate(duration = 0.3) {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  gearAudioContext ??= new AudioContext()

  const startSound = () => {
    const now = gearAudioContext.currentTime
    const clickCount = Math.max(3, Math.round(duration * 2))
    const interval = duration / clickCount
    for (let index = 0; index < clickCount; index += 1) {
      const clickTime = now + index * interval
      const body = gearAudioContext.createOscillator()
      const sparkle = gearAudioContext.createOscillator()
      const bodyGain = gearAudioContext.createGain()
      const sparkleGain = gearAudioContext.createGain()
      body.type = 'triangle'
      body.frequency.setValueAtTime(720 + (index % 2) * 90, clickTime)
      body.frequency.exponentialRampToValueAtTime(260, clickTime + 0.035)
      bodyGain.gain.setValueAtTime(0.03, clickTime)
      bodyGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.035)
      sparkle.type = 'sine'
      sparkle.frequency.setValueAtTime(2200 + (index % 3) * 180, clickTime)
      sparkle.frequency.exponentialRampToValueAtTime(900, clickTime + 0.018)
      sparkleGain.gain.setValueAtTime(0.05, clickTime)
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.018)
      body.connect(bodyGain)
      sparkle.connect(sparkleGain)
      bodyGain.connect(gearAudioContext.destination)
      sparkleGain.connect(gearAudioContext.destination)
      body.start(clickTime)
      sparkle.start(clickTime)
      body.stop(clickTime + 0.04)
      sparkle.stop(clickTime + 0.022)
    }
  }

  if (gearAudioContext.state === 'suspended') gearAudioContext.resume().then(startSound).catch(() => {})
  else startSound()
}
