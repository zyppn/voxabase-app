'use client'
// Six-box verification code input. One real <input> sits on top of the boxes, so
// typing, pasting a whole code, and phone autofill (one-time-code) all just work.
import { useState } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  onComplete?: (code: string) => void
  id?: string
  label?: string
  autoFocus?: boolean
  disabled?: boolean
  invalid?: boolean
  length?: number
}

export default function CodeInput({
  value, onChange, onComplete, id = 'code', label = 'Verification code',
  autoFocus, disabled, invalid, length = 6,
}: Props) {
  const [focused, setFocused] = useState(false)
  const digits = value.split('')
  const active = Math.min(value.length, length - 1)
  const half = Math.ceil(length / 2)

  const handle = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, length)
    onChange(next)
    if (next.length === length && next !== value) onComplete?.(next)
  }

  return (
    <div className="relative w-full">
      <input
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => handle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-text disabled:cursor-not-allowed"
      />
      <div aria-hidden="true" className="flex items-center justify-between gap-2 sm:gap-2.5">
        {Array.from({ length }, (_, i) => {
          const isActive = focused && i === active && value.length < length
          const filled = i < digits.length
          return (
            <div key={i} className="contents">
              {i === half && <span className="w-2.5 h-px bg-rule-3 shrink-0" />}
              <div
                className={[
                  'flex-1 min-w-0 aspect-[4/5] max-h-16 rounded-xl border flex items-center justify-center',
                  'text-2xl font-semibold text-paper bg-ink transition-colors duration-150',
                  invalid ? 'border-red-400/70 bg-red-400/5'
                    : isActive ? 'border-accent-mark ring-2 ring-accent/30'
                    : filled ? 'border-rule-3' : 'border-rule-2',
                  disabled ? 'opacity-50' : '',
                ].join(' ')}
              >
                {filled ? digits[i] : isActive ? <span className="w-px h-7 bg-paper animate-pulse" /> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
