'use client'

import { REASON_CODES, DecisionReasonCode } from '@dfg/types'
import { ToggleFilterChip, FilterChipColor } from './ui/FilterChip'
import { cn } from '@/lib/utils'

interface ReasonCodeSelectProps {
  value: DecisionReasonCode[]
  onChange: (codes: DecisionReasonCode[]) => void
  className?: string
}

// Color mapping by category
const CATEGORY_COLORS: Record<string, FilterChipColor> = {
  Price: 'red',
  Condition: 'orange',
  Title: 'amber',
  Location: 'gray',
  Demand: 'orange',
  Timing: 'gray',
  Inspection: 'red',
  Other: 'gray',
}

/**
 * Multi-select reason code component for PASS decisions.
 * Groups reason codes by category with color-coded chips.
 */
export function ReasonCodeSelect({ value, onChange, className }: ReasonCodeSelectProps) {
  // Group reason codes by category
  const categorizedCodes = REASON_CODES.reduce(
    (acc, option) => {
      if (!acc[option.category]) {
        acc[option.category] = []
      }
      acc[option.category].push(option)
      return acc
    },
    {} as Record<string, typeof REASON_CODES>
  )

  const handleToggle = (code: DecisionReasonCode) => {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code))
    } else {
      onChange([...value, code])
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {Object.entries(categorizedCodes).map(([category, options]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{category}</h4>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <ToggleFilterChip
                key={option.code}
                label={option.label}
                color={CATEGORY_COLORS[category]}
                active={value.includes(option.code)}
                onToggle={() => handleToggle(option.code)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
