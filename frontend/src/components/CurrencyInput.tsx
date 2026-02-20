import { useState, useRef } from 'react'
import { formatCurrency, parseCurrencyInput } from '../utils/currency'

type CurrencyInputProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function CurrencyInput({
  value,
  onChange,
  min,
  max,
  placeholder = '0,00',
  disabled = false,
  className = '',
  id,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [editingValue, setEditingValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = () => {
    setIsFocused(true)
    setEditingValue(value > 0 ? value.toString() : '')
  }

  const handleBlur = () => {
    const parsed = parseCurrencyInput(editingValue)
    const clamped = clamp(parsed)
    onChange(clamped)
    setEditingValue('')
    setIsFocused(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setEditingValue(raw)
    const parsed = parseCurrencyInput(raw)
    if (!Number.isNaN(parsed)) {
      onChange(clamp(parsed))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    }
  }

  function clamp(n: number): number {
    if (n === 0) return 0
    if (min != null && n < min) return min
    if (max != null && n > max) return max
    return n
  }

  const displayValue = isFocused ? editingValue : value > 0 ? formatCurrency(value) : ''

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      id={id}
      className={className}
      aria-label="Currency value"
    />
  )
}
