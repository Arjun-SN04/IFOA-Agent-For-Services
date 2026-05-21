import { useState, useEffect } from 'react'

export default function OtpTimer({ resetKey = 0, duration = 600 }) {
  const [seconds, setSeconds] = useState(duration)

  useEffect(() => {
    setSeconds(duration)
  }, [resetKey, duration])

  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const expired = seconds <= 0
  const warning = seconds > 0 && seconds < 60

  return (
    <span className={`text-xs font-semibold tabular-nums ${expired ? 'text-red-500' : warning ? 'text-orange-500' : 'text-slate-400'}`}>
      {expired ? 'Code expired — resend below' : `Expires in ${mins}:${String(secs).padStart(2, '0')}`}
    </span>
  )
}
