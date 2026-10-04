'use client'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { DashboardData, Region } from './types'
import { median } from './stats'

type Ctx = {
  data: DashboardData
  byId: Map<string, Region>
  ranks: Map<string, number>
  provinces: string[]
  /** State terpusat: wilayah terpilih. Semua visual membaca & menulis ke sini. */
  selected: Region
  select: (id: string) => void
  comparison: Region | null
  setComparison: (id: string | null) => void
  /** Filter provinsi global ('' = semua). */
  province: string
  setProvince: (p: string) => void
}
const C = createContext<Ctx | null>(null)

export function DashboardProvider({ data, children }: { data: DashboardData; children: ReactNode }) {
  const byId = useMemo(() => new Map<string, Region>(data.regions.map((r): [string, Region] => [r.id, r])), [data])
  const ranks = useMemo(() => {
    const m = new Map<string, number>()
    ;[...data.regions].sort((a, b) => b.ipm - a.ipm).forEach((r, i) => m.set(r.id, i + 1))
    return m
  }, [data])
  const provinces = useMemo(() => Array.from(new Set(data.regions.map((r) => r.provinsi))).sort(), [data])
  const initial = useMemo(() => {
    const med = median(data.regions.map((r) => r.ipm))
    return data.regions.reduce((b, r) => (Math.abs(r.ipm - med) < Math.abs(b.ipm - med) ? r : b), data.regions[0]).id
  }, [data])
  const [selectedId, setSelectedId] = useState(initial)
  const [comparisonId, setComparisonId] = useState<string | null>(null)
  const [province, setProvince] = useState('')
  const select = useCallback((id: string) => { if (byId.has(id)) setSelectedId(id) }, [byId])
  const setComparison = useCallback((id: string | null) => setComparisonId(id && byId.has(id) ? id : null), [byId])
  const value: Ctx = {
    data, byId, ranks, provinces, selected: byId.get(selectedId)!, select,
    comparison: comparisonId ? byId.get(comparisonId) ?? null : null, setComparison, province, setProvince,
  }
  return <C.Provider value={value}>{children}</C.Provider>
}
export function useDash() {
  const v = useContext(C)
  if (!v) throw new Error('useDash di luar DashboardProvider')
  return v
}
