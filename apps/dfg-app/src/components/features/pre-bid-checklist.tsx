'use client';

import * as React from 'react';
import { Check, ClipboardCheck } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  label: string;
  critical: boolean;
}

interface PreBidChecklistProps {
  items: ChecklistItem[];
  className?: string;
  onComplete?: (allCleared: boolean, clearedItems: string[]) => void;
}

export function PreBidChecklist({ items, className = '', onComplete }: PreBidChecklistProps) {
  const [checkedItems, setCheckedItems] = React.useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);

    // Notify parent of completion status
    if (onComplete) {
      const allCleared = items.every((item) => newChecked.has(item.id));
      onComplete(allCleared, Array.from(newChecked));
    }
  };

  const criticalItems = items.filter((item) => item.critical);
  const otherItems = items.filter((item) => !item.critical);
  const allCriticalCleared = criticalItems.every((item) => checkedItems.has(item.id));
  const allCleared = items.every((item) => checkedItems.has(item.id));

  return (
    <div
      className={`rounded-lg border-2 overflow-hidden ${className}`}
      style={{
        borderColor: allCriticalCleared
          ? 'rgba(34, 197, 94, 0.5)'
          : 'rgba(245, 158, 11, 0.5)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: allCriticalCleared
            ? 'rgba(34, 197, 94, 0.1)'
            : 'rgba(245, 158, 11, 0.1)',
        }}
      >
        <ClipboardCheck
          className={`h-5 w-5 ${
            allCriticalCleared
              ? 'text-green-600 dark:text-green-400'
              : 'text-yellow-600 dark:text-yellow-400'
          }`}
        />
        <div className="flex-1">
          <h3
            className={`font-medium ${
              allCriticalCleared
                ? 'text-green-600 dark:text-green-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}
          >
            Must Clear Before Bidding
          </h3>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {allCleared
              ? 'All items verified - ready to bid'
              : allCriticalCleared
                ? 'Critical items cleared - review remaining items'
                : `${criticalItems.length - checkedItems.size} critical item${
                    criticalItems.length - checkedItems.size > 1 ? 's' : ''
                  } remaining`}
          </p>
        </div>
        <div className="text-sm font-medium">
          {checkedItems.size}/{items.length}
        </div>
      </div>

      {/* Checklist */}
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {/* Critical items first */}
        {criticalItems.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            checked={checkedItems.has(item.id)}
            onToggle={() => toggleItem(item.id)}
          />
        ))}

        {/* Then non-critical items */}
        {otherItems.length > 0 && (
          <>
            {otherItems.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                checked={checkedItems.has(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
      style={{
        backgroundColor: checked ? 'rgba(34, 197, 94, 0.05)' : undefined,
      }}
    >
      <div
        className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked
            ? 'bg-green-600 border-green-600 dark:bg-green-500 dark:border-green-500'
            : item.critical
              ? 'border-red-400'
              : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <span
        className={`flex-1 text-sm ${
          checked ? 'line-through opacity-60' : ''
        }`}
      >
        {item.label}
        {item.critical && !checked && (
          <span className="ml-2 text-xs text-red-500 font-medium">CRITICAL</span>
        )}
      </span>
    </label>
  );
}
