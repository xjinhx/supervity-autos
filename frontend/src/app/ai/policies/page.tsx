'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardWatermark } from '@/components/ui/card-watermark'
import { Icons } from '@/components/ui/icons'
import { PolicyCard } from '@/components/command-center/policies/PolicyCard'
import { PolicyFormModal, type PolicyFormValues } from '@/components/command-center/policies/PolicyFormModal'
import { PolicyEvaluationsModal } from '@/components/command-center/policies/PolicyEvaluationsModal'
import type { Policy } from '@/types/command-center'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function AIPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [logPolicy, setLogPolicy] = useState<Policy | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadPolicies = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiClient.get<Policy[]>('/api/policies')
      setPolicies(data)
    } catch {
      setPolicies([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  const handleToggleActive = async (policy: Policy) => {
    setTogglingId(policy.id)
    try {
      await apiClient.patch(`/api/policies/${policy.id}`, { active: !policy.active })
      await loadPolicies()
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (policy: Policy) => {
    if (!confirm(`Delete policy "${policy.name}"? This cannot be undone.`)) return
    await apiClient.delete(`/api/policies/${policy.id}`)
    await loadPolicies()
  }

  const handleEdit = (policy: Policy) => {
    setEditingPolicy(policy)
    setFormOpen(true)
  }

  const handleFormSubmit = async (values: PolicyFormValues) => {
    const config = {
      metric: values.metric,
      operator: values.operator,
      value: Number(values.value),
      action: values.action,
    }
    if (editingPolicy) {
      await apiClient.patch(`/api/policies/${editingPolicy.id}`, {
        name: values.name,
        description: values.description,
        config,
      })
    } else {
      await apiClient.post('/api/policies', {
        name: values.name,
        description: values.description,
        policy_type: 'threshold',
        config,
        active: true,
      })
    }
    setFormOpen(false)
    setEditingPolicy(null)
    await loadPolicies()
  }

  const stats = {
    total: policies.length,
    active: policies.filter((p) => p.active).length,
    locked: policies.filter((p) => p.locked).length,
    flagged: policies.filter((p) => p.flagged_for_review).length,
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-3 font-bold tracking-tight text-brand-navy lg:text-display-2">AI Policies</h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Business-editable rules that constrain the Orchestrator at runtime — no code, full audit trail.
          </p>
        </div>
        <Button variant="gradient" onClick={() => { setEditingPolicy(null); setFormOpen(true) }}>
          <Icons.plus className="mr-2 h-4 w-4" />
          New Policy
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { value: stats.total, label: 'Total Policies', icon: Icons.layers, bg: 'bg-brand-navy/10', color: 'text-brand-navy' },
          { value: stats.active, label: 'Active', icon: Icons.check, bg: 'bg-emerald-100', color: 'text-emerald-600' },
          { value: stats.locked, label: 'Locked Compliance', icon: Icons.lock, bg: 'bg-blue-100', color: 'text-blue-600' },
          { value: stats.flagged, label: 'Flagged for Review', icon: Icons.flag, bg: 'bg-amber-100', color: 'text-amber-600' },
        ].map((stat) => (
          <motion.div key={stat.label} variants={itemVariants} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', stat.bg)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <div>
                <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Icons.loader className="h-8 w-8 animate-spin text-brand-cornflower" />
          </div>
        ) : policies.length === 0 ? (
          <Card className="relative overflow-hidden">
            <CardWatermark opacity={3} scale={1} />
            <CardContent className="relative z-10 flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cornflower/20 to-brand-purple/20">
                <Icons.brain className="h-8 w-8 text-brand-cornflower" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-brand-navy">No policies yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Create your first policy — no code required.</p>
              <Button variant="gradient" className="mt-6" onClick={() => setFormOpen(true)}>
                <Icons.plus className="mr-2 h-4 w-4" />
                New Policy
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {policies.map((policy) => (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  isToggling={togglingId === policy.id}
                  onToggleActive={handleToggleActive}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewLog={setLogPolicy}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <PolicyFormModal
        open={formOpen}
        editingPolicy={editingPolicy}
        onClose={() => { setFormOpen(false); setEditingPolicy(null) }}
        onSubmit={handleFormSubmit}
      />
      <PolicyEvaluationsModal policy={logPolicy} onClose={() => setLogPolicy(null)} />
    </motion.div>
  )
}
