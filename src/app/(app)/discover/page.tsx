'use client'

// Force dynamic rendering - this page uses Supabase which requires runtime env vars
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { calculateMatchScore } from '@/lib/matchScore'
import type { Profile, FriendRequest } from '@/types/database'

interface ProfileWithMatch extends Profile {
  matchScore: number
  matchReasons: string[]
  requestStatus?: 'pending' | 'sent' | null
}

const INTERESTS_FILTER = [
  'Basketball', 'Soccer', 'Football', 'Gaming', 'Music', 'Movies',
  'Reading', 'Hiking', 'Cooking', 'Photography', 'Fitness', 'Coding'
]

const YEARS_FILTER = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad']

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<ProfileWithMatch[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    year: '',
    interests: [] as string[],
  })
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch current user profile
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: Profile | null }

    if (!currentProfile) {
      window.location.href = '/onboarding'
      return
    }

    setCurrentUser(currentProfile)

    // Fetch all other profiles
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50) as { data: Profile[] | null }

    // Fetch existing friend requests
    const { data: sentRequests } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('from_user', user.id) as { data: FriendRequest[] | null }

    const { data: receivedRequests } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('to_user', user.id) as { data: FriendRequest[] | null }

    // Fetch friendships
    const { data: friendshipsA } = await supabase
      .from('friendships')
      .select('user_a, user_b')
      .eq('user_a', user.id) as { data: { user_a: string; user_b: string }[] | null }

    const { data: friendshipsB } = await supabase
      .from('friendships')
      .select('user_a, user_b')
      .eq('user_b', user.id) as { data: { user_a: string; user_b: string }[] | null }

    const allFriendships = [...(friendshipsA || []), ...(friendshipsB || [])]
    const friendIds = new Set(
      allFriendships.map((f) =>
        f.user_a === user.id ? f.user_b : f.user_a
      )
    )

    const sentMap = new Map(
      sentRequests?.map((r) => [r.to_user, r.status]) || []
    )
    const receivedMap = new Map(
      receivedRequests?.map((r) => [r.from_user, r.status]) || []
    )

    // Calculate match scores and filter out friends
    const profilesWithMatch: ProfileWithMatch[] = (allProfiles || [])
      .filter((p) => !friendIds.has(p.id))
      .map((profile) => {
        const match = calculateMatchScore(currentProfile, profile)
        let requestStatus: 'pending' | 'sent' | null = null

        if (sentMap.get(profile.id) === 'pending') {
          requestStatus = 'sent'
        } else if (receivedMap.get(profile.id) === 'pending') {
          requestStatus = 'pending'
        }

        return {
          ...profile,
          matchScore: match.score,
          matchReasons: match.reasons,
          requestStatus,
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)

    setProfiles(profilesWithMatch)
    setLoading(false)
  }

  const filteredProfiles = profiles.filter((profile) => {
    if (filters.year && profile.year !== filters.year) return false
    if (filters.interests.length > 0) {
      const hasInterest = filters.interests.some((i) =>
        profile.interests.includes(i)
      )
      if (!hasInterest) return false
    }
    return true
  })

  const sendFriendRequest = async (toUserId: string, note?: string) => {
    setSending(toUserId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        from_user: user.id,
        to_user: toUserId,
        note: note || null,
      })

    if (!error) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === toUserId ? { ...p, requestStatus: 'sent' } : p
        )
      )
    }

    setSending(null)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 h-64"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 animate-fade-in">
        <div>
          <h1 className="text-4xl font-black text-prestige-gradient tracking-tight">
            Discover Spartans
          </h1>
          <p className="text-gray-500 font-medium mt-1">Found {filteredProfiles.length} potential matches for you.</p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary-prestige !px-5 ${showFilters ? 'bg-msu-green/10 border-msu-green text-msu-green' : ''}`}
        >
          <span className="text-lg">{showFilters ? '✕' : '⚙️'}</span>
          {showFilters ? 'Hide Filters' : 'Filter Vibes'}
        </button>
      </div>

      {showFilters && (
        <div className="card-prestige !p-8 mb-12 animate-fade-in bg-white/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
                Academic Year
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters({ ...filters, year: '' })}
                  className={!filters.year ? 'chip-prestige chip-prestige-active' : 'chip-prestige'}
                >
                  All Years
                </button>
                {YEARS_FILTER.map((year) => (
                  <button
                    key={year}
                    onClick={() => setFilters({ ...filters, year })}
                    className={filters.year === year ? 'chip-prestige chip-prestige-active' : 'chip-prestige'}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
                Interests & Vibes
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS_FILTER.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => {
                      setFilters((prev) => ({
                        ...prev,
                        interests: prev.interests.includes(interest)
                          ? prev.interests.filter((i) => i !== interest)
                          : [...prev.interests, interest],
                      }))
                    }}
                    className={
                      filters.interests.includes(interest)
                        ? 'chip-prestige chip-prestige-active'
                        : 'chip-prestige'
                    }
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => setFilters({ year: '', interests: [] })}
              className="text-xs font-black text-msu-green uppercase tracking-widest hover:opacity-70 transition-opacity"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      )}

      {filteredProfiles.length === 0 ? (
        <div className="text-center py-20 card-prestige bg-gray-50/50 border-dashed border-2 animate-fade-in">
          <span className="text-6xl block mb-6 grayscale opacity-20">🍃</span>
          <p className="text-xl font-bold text-gray-400">No Spartans match this vibe yet.</p>
          <button
            onClick={() => setFilters({ year: '', interests: [] })}
            className="mt-4 text-msu-green font-bold hover:underline"
          >
            Clear filters and try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProfiles.map((profile, idx) => (
            <div
              key={profile.id}
              className={`card-prestige !p-0 overflow-hidden group animate-fade-in reveal-delay-${(idx % 3) + 1}`}
            >
              <div className="relative h-32 bg-msu-gradient overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-white/20 blur-3xl rounded-full" />
              </div>

              <div className="px-8 pb-8 relative">
                <div className="flex justify-between items-end -mt-12 mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-white p-1.5 shadow-xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2">
                      <div className="w-full h-full rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl">👤</span>
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full shadow-sm" />
                  </div>

                  <div className="flex flex-col items-center bg-white px-4 py-2 rounded-2xl shadow-lg border border-gray-50">
                    <span className={`text-xl font-black ${profile.matchScore >= 50 ? 'text-msu-green' :
                      profile.matchScore >= 25 ? 'text-msu-green-light' : 'text-gray-400'
                      }`}>
                      {profile.matchScore}%
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-300">Match</span>
                  </div>
                </div>

                <div className="mb-6">
                  <Link href={`/profile/${profile.id}`} className="group/name">
                    <h3 className="text-xl font-black text-gray-900 group-hover/name:text-msu-green transition-colors leading-tight">
                      {profile.full_name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    {profile.pronouns && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-msu-green bg-msu-green/5 px-2 py-0.5 rounded">
                        {profile.pronouns}
                      </span>
                    )}
                    <span className="text-xs font-bold text-gray-400">
                      {profile.major && profile.year
                        ? `${profile.major} • ${profile.year}`
                        : profile.major || profile.year || 'MSU Student'}
                    </span>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-sm text-gray-500 font-medium line-clamp-2 italic mb-6">
                    "{profile.bio}"
                  </p>
                )}

                {profile.matchReasons.length > 0 && (
                  <div className="space-y-2 mb-8">
                    {profile.matchReasons.slice(0, 2).map((reason, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] font-black text-msu-green-light uppercase tracking-tight bg-msu-green/5 px-3 py-1.5 rounded-xl border border-msu-green/5">
                        <span className="text-[#c084fc]">✨</span> {reason}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  {profile.requestStatus === 'sent' ? (
                    <button disabled className="flex-1 btn-secondary-prestige !bg-msu-green/5 !text-msu-green/40 !border-msu-green/10 cursor-not-allowed">
                      Pending
                    </button>
                  ) : profile.requestStatus === 'pending' ? (
                    <Link href="/requests" className="flex-1 btn-prestige">
                      View Invite
                    </Link>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(profile.id)}
                      disabled={sending === profile.id}
                      className="flex-1 btn-prestige"
                    >
                      {sending === profile.id ? '...' : 'Connect'}
                    </button>
                  )}
                  <Link
                    href={`/profile/${profile.id}`}
                    className="btn-secondary-prestige !px-4"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
