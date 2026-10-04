'use client'
import { useState } from 'react'
import { CircleHelp, GraduationCap, HeartPulse, WalletCards } from 'lucide-react'
import type { DashboardData } from '@/lib/types'
import { DashboardProvider } from '@/lib/dashboard-context'
import Overview from './tabs/Overview'
import Relations from './tabs/Relations'
import Profile from './tabs/Profile'
import Findings from './tabs/Findings'
import '@/app/dashboard.css'
import '@/app/dashboard-extra.css'

type Tab = 'overview' | 'relations' | 'profile' | 'findings'
const TABS: [Tab, string][] = [
  ['overview', '01 Ikhtisar & Peta'], ['relations', '02 Hubungan & Multivariat'], ['profile', '03 Profil, Variasi & Struktur'], ['findings', '04 Temuan & Metodologi'],
]

export default function Dashboard({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState<Tab>('overview')
  const go = (t: Tab) => { setTab(t); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }) }
  const n = data.regions.length
  return (
    <DashboardProvider data={data}>
      <main>
        <div className="topline"><span>INDONESIA 2025 / DATA STORY</span><span className="source">BPS · {n} kabupaten/kota</span></div>
        <nav className="tabs" aria-label="Bagian dashboard" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </nav>
        <header className="hero">
          <div className="hero-copy">
            <div className="kicker"><span className="dot" /> {TABS.find(([k]) => k === tab)?.[1]}</div>
            <h1>DI BALIK <em>ANGKA</em><br />IPM 2025</h1>
            <p className="tagline">Satu angka, banyak wajah.</p>
            <p className="lede">Perbandingan profil pembangunan manusia {n} kabupaten/kota di Indonesia.</p>
            <div className="question"><CircleHelp /><p>Apakah kabupaten/kota dengan IPM yang serupa benar-benar memiliki profil pembangunan manusia yang sama?</p></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="island-mark">IND<br /><b>{n}</b></div>
            <div className="art-chip chip-a"><GraduationCap /> pendidikan</div>
            <div className="art-chip chip-b"><HeartPulse /> kesehatan</div>
            <div className="art-chip chip-c"><WalletCards /> kesejahteraan</div>
          </div>
        </header>
        <div className="content">
          {tab === 'overview' && <Overview goProfile={() => go('profile')} />}
          {tab === 'relations' && <Relations />}
          {tab === 'profile' && <Profile />}
          {tab === 'findings' && <Findings />}
        </div>
        <footer><span>DI BALIK ANGKA IPM 2025</span><span>Sumber: BPS 2025 · batas wilayah GeoJSON 514 kab/kota</span></footer>
      </main>
    </DashboardProvider>
  )
}
