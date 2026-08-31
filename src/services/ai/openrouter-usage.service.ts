/** Fetch live OpenRouter key budget/usage via GET /api/v1/key (never exposes full key). */

export interface OpenRouterKeyUsage {
  label: string
  usage: number
  usageDaily: number
  usageWeekly: number
  usageMonthly: number
  limit: number | null
  limitRemaining: number | null
  limitReset: string | null
}

export async function fetchOpenRouterKeyUsage(): Promise<OpenRouterKeyUsage | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '')

  try {
    const res = await fetch(`${baseUrl}/key`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!res.ok) {
      console.warn('OpenRouter key usage fetch failed:', res.status, await res.text())
      return null
    }

    const json = (await res.json()) as { data?: Record<string, unknown> }
    const data = json.data
    if (!data) return null

    const label = typeof data.label === 'string' ? maskKeyLabel(data.label) : 'OpenRouter'

    return {
      label,
      usage: Number(data.usage) || 0,
      usageDaily: Number(data.usage_daily) || 0,
      usageWeekly: Number(data.usage_weekly) || 0,
      usageMonthly: Number(data.usage_monthly) || 0,
      limit: data.limit != null ? Number(data.limit) : null,
      limitRemaining: data.limit_remaining != null ? Number(data.limit_remaining) : null,
      limitReset: typeof data.limit_reset === 'string' ? data.limit_reset : null,
    }
  } catch (error) {
    console.warn('OpenRouter key usage fetch error:', error)
    return null
  }
}

/** Mask sk-or-v1-… labels from OpenRouter to a safe display string. */
export function maskKeyLabel(label: string): string {
  if (/^sk-or-/i.test(label)) return 'OpenRouter'
  if (label.length <= 12) return label
  return `${label.slice(0, 4)}…${label.slice(-4)}`
}
