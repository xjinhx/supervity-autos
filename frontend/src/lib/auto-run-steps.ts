// Auto's workflow-run response wraps its per-step results at a nesting
// depth this app doesn't control (varies by workflow shape). Rather than
// assume one fixed path, walk the response and pull out whichever array
// looks like a step list — each element has stepName + outputs.
export interface AutoRunStep {
  id?: string
  stepName?: string
  stepDescription?: string
  status?: string
  outputs?: {
    displayData?: { html?: string }
    output?: string
    error?: string
  }
}

function looksLikeStep(value: unknown): value is AutoRunStep {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.stepName === 'string' && typeof v.outputs === 'object' && v.outputs !== null
}

export function findAutoRunSteps(payload: unknown, depth = 0): AutoRunStep[] {
  if (depth > 6 || !payload || typeof payload !== 'object') return []

  if (Array.isArray(payload)) {
    if (payload.length > 0 && payload.every(looksLikeStep)) {
      return payload as AutoRunStep[]
    }
    for (const item of payload) {
      const found = findAutoRunSteps(item, depth + 1)
      if (found.length) return found
    }
    return []
  }

  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0 && value.every(looksLikeStep)) {
      return value as AutoRunStep[]
    }
  }
  for (const value of Object.values(payload as Record<string, unknown>)) {
    const found = findAutoRunSteps(value, depth + 1)
    if (found.length) return found
  }
  return []
}
