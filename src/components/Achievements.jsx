import { useState, useEffect, useEffectEvent } from 'react'
import { supabase } from '../lib/supabase'
import { getCached, setCached } from '../lib/cache'
import { useCurrentUserId } from '../context/UserContext'
import { fetchProfileWithWorkoutCount } from '../lib/workoutCount'
import { ACHIEVEMENTS, CATEGORIES } from '../data/achievements'
import LoadingSpinner from './LoadingSpinner'
import '../styles/Achievements.css'

const TIER_STYLES = {
  bronze:   { color: '#cd7f32', bg: 'rgba(205,127,50,0.15)',  border: 'rgba(205,127,50,0.4)'  },
  silver:   { color: '#9ca3af', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.4)' },
  gold:     { color: '#eab308', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.4)'   },
  platinum: { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.4)'  },
  diamond:  { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)' },
}

// Icon shown inside the badge when UNLOCKED — changes per tier
const TIER_ICONS = {
  bronze: ( // seedling — just getting started
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12"/><path d="M12 12C12 12 8 8 4 9c0 4 4 7 8 7s8-3 8-7c-4-1-8 3-8 3z"/>
    </svg>
  ),
  silver: ( // medal
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="15" r="5"/><path d="M8.5 8.5 8 4l4 2 4-2-.5 4.5"/>
    </svg>
  ),
  gold: ( // trophy
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/>
      <path d="M6 3h12v7a6 6 0 0 1-12 0V3z"/><path d="M9 22h6"/><path d="M12 16v6"/>
    </svg>
  ),
  platinum: ( // crown
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20"/><path d="M4 20 2 8l5 4 5-7 5 7 5-4-2 12"/>
    </svg>
  ),
  diamond: ( // gem/diamond
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12 6 4h12l4 8-10 8L2 12z"/><path d="M6 4l4 8M18 4l-4 8M2 12h20"/>
    </svg>
  ),
}

const CAT_ICONS = {
  Strength: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h12M6 16h12"/><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/>
      <rect x="6" y="6" width="3" height="12" rx="1"/><rect x="15" y="6" width="3" height="12" rx="1"/>
    </svg>
  ),
  Consistency: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/>
    </svg>
  ),
  Nutrition: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
}

export default function Achievements({ onBack }) {
  const userId = useCurrentUserId()
  const [unlocked, setUnlocked] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const cached = getCached('achievements')
      if (cached) {
        setUnlocked(new Set(cached))
        return
      }

      const [
        { data: profileData, error: profileError },
        { data: prs, error: prsError },
        { data: nutData, error: nutritionError },
      ] = await Promise.all([
        fetchProfileWithWorkoutCount(userId, ['lifetime_volume_kg']),
        supabase
          .from('exercise_prs')
          .select('best_1rm_kg, exercises!inner(name)')
          .eq('user_id', userId),
        supabase
          .from('nutrition_logs')
          .select('log_date')
          .eq('user_id', userId)
          .limit(1000),
      ])
      const error = profileError || prsError || nutritionError
      if (error) throw error

      // Max ORM in kg per exercise name — best_1rm_kg is already in kg
      const maxOrmKg = {}
      for (const pr of prs || []) {
        const name = pr.exercises.name.toLowerCase()
        if ((pr.best_1rm_kg || 0) > 0) {
          maxOrmKg[name] = Math.max(maxOrmKg[name] || 0, pr.best_1rm_kg)
        }
      }
      const totalVolumeKg = profileData?.lifetime_volume_kg ?? 0
      const sessionCount = Math.max(0, Number(profileData?.workout_count) || 0)

      const nutDayCount = new Set((nutData || []).map(n => n.log_date)).size

      const unlockedIds = new Set()
      for (const a of ACHIEVEMENTS) {
        if (a.match) {
          const best = Object.entries(maxOrmKg)
            .filter(([name]) => name.includes(a.match))
            .reduce((max, [, orm]) => Math.max(max, orm), 0)
          if (best >= a.kgTarget) unlockedIds.add(a.id)
        } else if (a.sessions !== undefined) {
          if ((sessionCount || 0) >= a.sessions) unlockedIds.add(a.id)
        } else if (a.nutDays !== undefined) {
          if (nutDayCount >= a.nutDays) unlockedIds.add(a.id)
        } else if (a.totalVolumeKg !== undefined) {
          if (totalVolumeKg >= a.totalVolumeKg) unlockedIds.add(a.id)
        }
      }

      setCached('achievements', [...unlockedIds], 10 * 60 * 1000) // 10 min TTL
      setUnlocked(unlockedIds)
    } catch (error) {
      setLoadError(error?.message || 'Could not load achievements. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadLatest = useEffectEvent(() => { load() })

  useEffect(() => {
    const timer = setTimeout(() => { loadLatest() }, 0)
    return () => clearTimeout(timer)
  }, [userId])

  const total = ACHIEVEMENTS.length
  const count = unlocked.size

  return (
    <div className="ach-screen">
      <div className="ach-topbar">
        <button className="ach-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div>
          <div className="ach-title">Achievements</div>
          {!loading && <div className="ach-sub">{count} / {total} unlocked</div>}
        </div>
      </div>

      {loading ? (
        <div className="ach-loading"><LoadingSpinner size="lg" /></div>
      ) : loadError ? (
        <div className="ach-loading">
          <p style={{ color: 'var(--muted)', textAlign: 'center', margin: 0 }}>{loadError}</p>
          <button className="ach-back" onClick={load} style={{ width: 'auto', padding: '0 14px' }}>Retry</button>
        </div>
      ) : (
        CATEGORIES.map(cat => {
          const items = ACHIEVEMENTS.filter(a => a.cat === cat)
          const catUnlocked = items.filter(a => unlocked.has(a.id)).length
          return (
            <div key={cat} className="ach-section">
              <div className="ach-section-header">
                <span className="ach-section-icon">{CAT_ICONS[cat]}</span>
                <span className="ach-section-name">{cat}</span>
                <span className="ach-section-count">{catUnlocked}/{items.length}</span>
              </div>
              <div className="ach-list">
                {items.map(a => {
                  const done = unlocked.has(a.id)
                  const ts = TIER_STYLES[a.tier]
                  return (
                    <div
                      key={a.id}
                      className={`ach-card ${done ? 'ach-card-done' : ''}`}
                      style={done ? { background: ts.bg, borderColor: ts.border } : {}}
                    >
                      <div
                        className="ach-badge"
                        style={done
                          ? { background: ts.bg, borderColor: ts.border, color: ts.color }
                          : {}
                        }
                      >
                        {done
                          ? (a.emoji
                              ? <span style={{ fontSize: '20px', lineHeight: 1 }}>{a.emoji}</span>
                              : TIER_ICONS[a.tier])
                          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        }
                      </div>
                      <div className="ach-info">
                        <div className="ach-name" style={done ? { color: ts.color } : {}}>{a.title}</div>
                        <div className="ach-desc">{a.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
