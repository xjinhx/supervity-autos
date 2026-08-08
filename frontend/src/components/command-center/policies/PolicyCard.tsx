'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import type { PolicyField, PolicyOut } from '@/types/command-center'

interface PolicyFieldRowProps {
  field: PolicyField
  onSave: (key: string, value: string) => Promise<void>
}

function PolicyFieldRow({ field, onSave }: PolicyFieldRowProps) {
  const [value, setValue] = useState(field.value ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const dirty = value !== (field.value ?? '')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(field.key, value)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">{field.label}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="—"
          className="w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
        />
      </div>
      <Button
        size="icon-sm"
        variant={dirty ? 'gradient' : 'ghost'}
        disabled={!dirty || isSaving}
        onClick={handleSave}
        title="Save"
      >
        {isSaving ? <Icons.loader className="h-3.5 w-3.5 animate-spin" /> : <Icons.check className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

interface PolicyCardProps {
  policy: PolicyOut
  onSaveField: (key: string, value: string) => Promise<void>
  onViewLog: (policy: PolicyOut) => void
}

export function PolicyCard({ policy, onSaveField, onViewLog }: PolicyCardProps) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="relative h-full overflow-hidden">
        <CardContent className="relative z-10 flex h-full flex-col gap-4 p-5">
          <div>
            <h3 className="font-display text-base font-semibold text-brand-navy">{policy.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{policy.description}</p>
          </div>

          <div className="space-y-3">
            {policy.fields.map((field) => (
              <PolicyFieldRow key={field.key} field={field} onSave={onSaveField} />
            ))}
          </div>

          <button
            onClick={() => onViewLog(policy)}
            className="mt-auto flex items-center gap-1.5 pt-1 text-xs font-medium text-brand-cornflower hover:text-brand-navy"
          >
            <Icons.history className="h-3.5 w-3.5" />
            View evaluation log
          </button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
