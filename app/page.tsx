import Dashboard from '@/components/dashboard/Dashboard'
import { loadDashboardData } from '@/lib/load-data'

// Data (CSV + GeoJSON) dibaca dari public/data saat build dan di-prerender statis.
export default async function Page() {
  const data = await loadDashboardData()
  return <Dashboard data={data} />
}
