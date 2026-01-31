'use client'

// Force dynamic rendering - this page uses Supabase which requires runtime env vars
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { calculateMatchScore } from '@/lib/matchScore'
import type { Profile } from '@/types/database'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [relationshipStatus, setRelationshipStatus] = useState<'none' | 'friends' | 'sent' | 'received'>('none')
  const [matchScore, setMatchScore] = useState<{ score: number; reasons: string[] } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [profileId])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if viewing own profile
    if (user.id === profileId) {
      router.push('/profile')
      return
    }

    // Fetch the profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()

    if (!profileData) {
      router.push('/discover')
      return
    }

    setProfile(profileData)

    // Fetch current user profile
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (currentProfile) {
      setCurrentUser(currentProfile)
      const match = calculateMatchScore(currentProfile, profileData)
      setMatchScore(match)
    }

    // Check friendship status (two queries to avoid TypeScript issues with .or())
    const { data: friendshipA } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_a', user.id)
      .eq('user_b', profileId)
      .single()

    const { data: friendshipB } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_a', profileId)
      .eq('user_b', user.id)
      .single()

    if (friendshipA || friendshipB) {
      setRelationshipStatus('friends')
    } else {
      // Check for pending requests
      const { data: sentRequest } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('from_user', user.id)
        .eq('to_user', profileId)
        .eq('status', 'pending')
        .single()

      if (sentRequest) {
        setRelationshipStatus('sent')
      } else {
        const { data: receivedRequest } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('from_user', profileId)
          .eq('to_user', user.id)
          .eq('status', 'pending')
          .single()

        if (receivedRequest) {
          setRelationshipStatus('received')
        }
      }
    }

    setLoading(false)
  }

  const sendFriendRequest = async () => {
    if (!currentUser) return

    setSending(true)

    const { error } = await supabase
      .from('friend_requests')
      .insert({
        from_user: currentUser.id,
        to_user: profileId,
      })

    if (!error) {
      setRelationshipStatus('sent')
    }

    setSending(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 w-32 bg-gray-200 rounded-full mx-auto"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 relative animate-fade-in">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-msu-green/5 blur-[100px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-msu-accent/5 blur-[120px] rounded-full -z-10" />

      <Link
        href="/discover"
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-msu-green mb-8 transition-colors group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Discovery
      </Link>

      <div className="card-prestige !p-0 overflow-hidden shadow-2xl">
        {/* Profile Header */}
        <div className="relative h-48 bg-msu-gradient">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

          {/* Match score Badge */}
          {matchScore && matchScore.score > 0 && (
            <div className="absolute top-6 right-8 glass-panel !bg-white/10 !backdrop-blur-md !border-white/20 !p-4 flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-tighter text-white/60">Spartan Match</span>
                <span className={`text-2xl font-black ${matchScore.score >= 50 ? 'text-white' :
                  matchScore.score >= 25 ? 'text-white/80' : 'text-white/60'
                  }`}>
                  {matchScore.score}%
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                {matchScore.score >= 50 ? '🔥' : matchScore.score >= 25 ? '✨' : '👋'}
              </div>
            </div>
          )}
        </div>

        <div className="px-10 pb-12">
          {/* Avatar & Action Button */}
          <div className="flex flex-col md:flex-row items-end gap-8 -mt-16 mb-12">
            <div className="relative">
              <div className="w-40 h-40 rounded-[2.5rem] bg-white p-2 shadow-2xl overflow-hidden transition-transform duration-500 hover:scale-105">
                <div className="w-full h-full rounded-[2rem] bg-gray-100 overflow-hidden flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">👤</span>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg" />
            </div>

            <div className="flex-1 pb-2">
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">{profile.full_name}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {profile.pronouns && (
                  <span className="text-xs font-black uppercase tracking-widest text-[#c084fc] bg-msu-accent/5 px-3 py-1 rounded-full">{profile.pronouns}</span>
                )}
                <span className="text-gray-400 font-bold">
                  {profile.major && profile.year
                    ? `${profile.major} • ${profile.year}`
                    : profile.major || profile.year || 'MSU Student'}
                </span>
                {profile.campus_area && (
                  <span className="text-xs font-bold text-msu-green-light px-3 py-1 bg-msu-green/5 rounded-full border border-msu-green/10">📍 {profile.campus_area}</span>
                )}
              </div>
            </div>

            <div className="pb-2">
              {relationshipStatus === 'friends' && (
                <div className="btn-prestige !bg-green-500 !cursor-default shadow-none">
                  <span className="text-sm">✓ Already Friends</span>
                </div>
              )}
              {relationshipStatus === 'sent' && (
                <div className="btn-secondary-prestige !bg-gray-100 !text-gray-400 !border-transparent !cursor-default">
                  <span className="text-sm">Request Pending</span>
                </div>
              )}
              {relationshipStatus === 'received' && (
                <Link href="/requests" className="btn-prestige !bg-msu-green shadow-xl">
                  <span className="text-sm">Respond to Invite</span>
                </Link>
              )}
              {relationshipStatus === 'none' && (
                <button
                  onClick={sendFriendRequest}
                  disabled={sending}
                  className="btn-prestige !px-8 shadow-xl"
                >
                  {sending ? '...' : 'Send Invite'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-12">
              <section className="animate-fade-in reveal-delay-1">
                <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">The Narrative (Bio)</h3>
                <p className="text-lg text-gray-600 font-medium leading-relaxed italic">
                  {profile.bio ? `"${profile.bio}"` : "This spartan keeps their legacy a mystery for now."}
                </p>

                {matchScore && matchScore.reasons.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <h4 className="text-[10px] font-black text-msu-green-light uppercase tracking-widest mb-4">Why you'll vibe</h4>
                    <div className="space-y-3">
                      {matchScore.reasons.map((reason, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm font-bold text-gray-700 bg-white shadow-sm border border-gray-50 px-5 py-3 rounded-2xl transition-transform hover:translate-x-1">
                          <span className="text-[#c084fc]">✨</span> {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="animate-fade-in reveal-delay-2">
                <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">Spartan Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <span
                      key={interest}
                      className={
                        currentUser?.interests.includes(interest)
                          ? 'chip-prestige chip-prestige-active'
                          : 'chip-prestige'
                      }
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-12">
              <section className="animate-fade-in reveal-delay-3">
                <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">Desired Connection</h3>
                <div className="grid grid-cols-1 gap-3">
                  {profile.looking_for.map((item) => (
                    <div
                      key={item}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${currentUser?.looking_for.includes(item)
                        ? 'bg-msu-green/5 border-msu-green/20'
                        : 'bg-msu-accent/5 border-msu-accent/10'
                        }`}
                    >
                      <span className="text-xl">{currentUser?.looking_for.includes(item) ? '🔥' : '🤝'}</span>
                      <span className={`font-black text-xs uppercase tracking-tight ${currentUser?.looking_for.includes(item) ? 'text-msu-green' : 'text-gray-700'
                        }`}>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div className="p-8 rounded-[2.5rem] bg-msu-gradient text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                <h4 className="text-lg font-black tracking-tight mb-2 relative z-10">Start a Legacy?</h4>
                <p className="text-white/70 text-sm font-medium leading-relaxed relative z-10">Send an invite to start a conversation with {profile.full_name} and find your edge together.</p>
                <div className="mt-6 relative z-10">
                  <button
                    onClick={sendFriendRequest}
                    disabled={sending || relationshipStatus !== 'none'}
                    className="w-full py-3 bg-white text-msu-green font-black rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
                  >
                    {relationshipStatus === 'none' ? 'Go Spartan' : 'Connected'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
