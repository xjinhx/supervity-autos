'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { CardWatermark } from '@/components/ui/card-watermark'
import { Icons } from '@/components/ui/icons'
import { PolicyCard } from '@/components/command-center/policies/PolicyCard'
import { PolicyEvaluationsModal } from '@/components/command-center/policies/PolicyEvaluationsModal'
import type { PolicyOut } from '@/types/command-center'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function AIPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyOut[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [logPolicy, setLogPolicy] = useState<PolicyOut | null>(null)

  const loadPolicies = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiClient.get<PolicyOut[]>('/api/policies')
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

  const handleSaveField = async (key: string, value: string) => {
    await apiClient.patch(`/api/policies/${key}`, { value })
    await loadPolicies()
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants}>
        <h1 className="text-display-3 font-bold tracking-tight text-brand-navy lg:text-display-2">AI Policies</h1>
        <p className="mt-1 text-lg text-muted-foreground">
          Business-editable thresholds that drive the Orchestrator&apos;s Operators — no code, no redeploy.
        </p>
      </motion.div>

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
              <h3 className="font-display text-lg font-semibold text-brand-navy">No policies configured</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Supabase config is unreachable or empty.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {policies.map((policy) => (
                <PolicyCard key={policy.name} policy={policy} onSaveField={handleSaveField} onViewLog={setLogPolicy} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <PolicyEvaluationsModal policy={logPolicy} onClose={() => setLogPolicy(null)} />
    </motion.div>
  )
}
