'use client'

// Force dynamic rendering - this page uses Supabase which requires runtime env vars
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile, FriendRequest } from '@/types/database'

interface RequestWithProfile extends FriendRequest {
  profile: Profile
}

export default function RequestsPage() {
  const [incomingRequests, setIncomingRequests] = useState<RequestWithProfile[]>([])
  const [sentRequests, setSentRequests] = useState<RequestWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'incoming' | 'sent'>('incoming')
  const supabase = createClient()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch incoming requests
    const { data: incoming } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('to_user', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Fetch sent requests
    const { data: sent } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('from_user', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Get all unique user IDs to fetch profiles
    const userIds = [
      ...(incoming?.map((r: FriendRequest) => r.from_user) || []),
      ...(sent?.map((r: FriendRequest) => r.to_user) || []),
    ]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map((p: Profile) => [p.id, p]) || [])

    setIncomingRequests(
      (incoming || []).map((r: FriendRequest) => ({
        ...r,
        profile: profileMap.get(r.from_user)!,
      })).filter((r: RequestWithProfile) => r.profile)
    )

    setSentRequests(
      (sent || []).map((r: FriendRequest) => ({
        ...r,
        profile: profileMap.get(r.to_user)!,
      })).filter((r: RequestWithProfile) => r.profile)
    )

    setLoading(false)
  }

  const acceptRequest = async (requestId: string) => {
    setProcessing(requestId)

    const { error } = await supabase.rpc('accept_friend_request', {
      p_request_id: requestId,
    })

    if (!error) {
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
    }

    setProcessing(null)
  }

  const declineRequest = async (requestId: string) => {
    setProcessing(requestId)

    const { error } = await supabase.rpc('decline_friend_request', {
      p_request_id: requestId,
    })

    if (!error) {
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
    }

    setProcessing(null)
  }

  const cancelRequest = async (requestId: string) => {
    setProcessing(requestId)

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'canceled' })
      .eq('id', requestId)

    if (!error) {
      setSentRequests((prev) => prev.filter((r) => r.id !== requestId))
    }

    setProcessing(null)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-foreground-subtle/30 rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-background-elevated rounded-xl p-6 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 relative animate-fade-in">
      {/* Background accents */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-msu-green/5 blur-[100px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-msu-accent/5 blur-[120px] rounded-full -z-10" />

      <h1 className="text-4xl font-black text-prestige-gradient tracking-tight mb-8">
        Vibe Requests
      </h1>

      {/* Premium Tabs */}
      <div className="flex gap-4 mb-10">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`relative px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 ${activeTab === 'incoming'
            ? 'text-white bg-msu-gradient shadow-xl scale-105'
            : 'text-foreground-muted bg-background-elevated hover:bg-background border border-glass-border'
            }`}
        >
          Incoming
          {incomingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#c084fc] text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
              {incomingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`relative px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 ${activeTab === 'sent'
            ? 'text-white bg-msu-gradient shadow-xl scale-105'
            : 'text-foreground-muted bg-background-elevated hover:bg-background border border-glass-border'
            }`}
        >
          Sent
          {sentRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-msu-green-light text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
              {sentRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'incoming' && (
        <div className="space-y-6">
          {incomingRequests.length === 0 ? (
            <div className="text-center py-20 card-prestige bg-white/40 border-dashed border-2 animate-fade-in">
              <span className="text-6xl block mb-6 grayscale opacity-20">📭</span>
              <p className="text-xl font-black text-foreground-subtle">Your inbox is a quiet sanctuary.</p>
              <Link href="/discover" className="mt-4 text-msu-green font-black uppercase tracking-widest text-xs hover:underline inline-block">
                Discovery awaits →
              </Link>
            </div>
          ) : (
            incomingRequests.map((request, idx) => (
              <div
                key={request.id}
                className={`card-prestige !p-8 group animate-fade-in reveal-delay-${(idx % 3) + 1}`}
              >
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg group-hover:rotate-3 transition-transform">
                      <div className="w-full h-full rounded-xl bg-background-elevated overflow-hidden flex items-center justify-center">
                        {request.profile.avatar_url ? (
                          <img
                            src={request.profile.avatar_url}
                            alt={request.profile.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#c084fc] border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white">✨</div>
                  </div>

                  <div className="flex-1 text-center md:text-left min-w-0">
                    <Link href={`/profile/${request.profile.id}`} className="group/name">
                      <h3 className="text-xl font-black text-foreground group-hover/name:text-msu-green transition-colors leading-tight">
                        {request.profile.full_name}
                      </h3>
                    </Link>
                    <p className="text-sm font-bold text-foreground-subtle mt-1">
                      {request.profile.major && request.profile.year
                        ? `${request.profile.major} • ${request.profile.year}`
                        : request.profile.major || request.profile.year || 'MSU Student'}
                    </p>
                    {request.note && (
                      <div className="mt-4 relative">
                        <div className="absolute -left-2 top-0 text-2xl text-msu-green/10 font-serif">“</div>
                        <p className="text-sm text-foreground-muted font-medium leading-relaxed italic px-4">
                          {request.note}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                    <button
                      onClick={() => acceptRequest(request.id)}
                      disabled={processing === request.id}
                      className="flex-1 md:flex-none btn-prestige !px-8"
                    >
                      {processing === request.id ? '...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => declineRequest(request.id)}
                      disabled={processing === request.id}
                      className="flex-1 md:flex-none btn-secondary-prestige !bg-red-50 !text-red-700 !border-red-100 !px-8 hover:!bg-red-100"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'sent' && (
        <div className="space-y-6">
          {sentRequests.length === 0 ? (
            <div className="text-center py-20 card-prestige bg-white/40 border-dashed border-2 animate-fade-in">
              <span className="text-6xl block mb-6 grayscale opacity-20">🚀</span>
              <p className="text-xl font-black text-foreground-subtle">No signals currently in orbit.</p>
              <Link href="/discover" className="mt-4 text-msu-green font-black uppercase tracking-widest text-xs hover:underline inline-block">
                Forge a new connection →
              </Link>
            </div>
          ) : (
            sentRequests.map((request, idx) => (
              <div
                key={request.id}
                className={`card-prestige !p-8 group animate-fade-in reveal-delay-${(idx % 3) + 1}`}
              >
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg group-hover:-rotate-3 transition-transform">
                    <div className="w-full h-full rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
                      {request.profile.avatar_url ? (
                        <img
                          src={request.profile.avatar_url}
                          alt={request.profile.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">👤</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 text-center md:text-left min-w-0">
                    <Link href={`/profile/${request.profile.id}`} className="group/name">
                      <h3 className="text-xl font-black text-foreground group-hover/name:text-msu-green transition-colors leading-tight">
                        {request.profile.full_name}
                      </h3>
                    </Link>
                    <p className="text-sm font-bold text-foreground-subtle mt-1">
                      {request.profile.major && request.profile.year
                        ? `${request.profile.major} • ${request.profile.year}`
                        : request.profile.major || request.profile.year || 'MSU Student'}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-msu-accent animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#c084fc]">Broadcasting Profile</span>
                    </div>
                  </div>

                  <div className="w-full md:w-auto">
                    <button
                      onClick={() => cancelRequest(request.id)}
                      disabled={processing === request.id}
                      className="w-full md:w-auto text-xs font-black uppercase tracking-widest text-foreground-subtle hover:text-red-500 transition-colors py-2 px-4 border border-transparent hover:border-red-100 rounded-xl"
                    >
                      {processing === request.id ? '...' : 'Retract Signal'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
