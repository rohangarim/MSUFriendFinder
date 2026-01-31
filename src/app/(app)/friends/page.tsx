'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export default function FriendsPage() {
  const [friends, setFriends] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchFriends()
  }, [])

  const fetchFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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

    if (!allFriendships.length) {
      setLoading(false)
      return
    }

    // Get friend IDs
    const friendIds = allFriendships.map((f) =>
      f.user_a === user.id ? f.user_b : f.user_a
    )

    // Fetch friend profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds)

    setFriends(profiles || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 relative animate-fade-in">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-msu-green/5 blur-[100px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-msu-accent/5 blur-[120px] rounded-full -z-10" />

      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black text-prestige-gradient tracking-tight">
            Spartan Network
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">
            Your {friends.length} Elite Connections
          </p>
        </div>
        <Link href="/discover" className="btn-secondary-prestige !px-6 !py-3 !text-xs !bg-white">
          Expand Network
        </Link>
      </div>

      {friends.length === 0 ? (
        <div className="text-center py-24 card-prestige bg-white/40 border-dashed border-2 animate-fade-in">
          <span className="text-6xl block mb-6 grayscale opacity-20">🤝</span>
          <p className="text-xl font-black text-gray-400">Your network is currently a blank canvas.</p>
          <Link href="/discover" className="mt-6 btn-prestige inline-block !px-8">
            Start Discovering
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {friends.map((friend, idx) => (
            <Link
              key={friend.id}
              href={`/profile/${friend.id}`}
              className={`card-prestige !p-6 group flex items-center gap-6 animate-fade-in reveal-delay-${(idx % 3) + 1} transition-all hover:scale-[1.02] active:scale-[0.98] border-transparent hover:border-msu-green/20`}
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg group-hover:rotate-3 transition-transform">
                  <div className="w-full h-full rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-msu-green border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white">✓</div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-gray-900 group-hover:text-msu-green transition-colors leading-tight truncate">
                  {friend.full_name}
                </h3>
                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider truncate">
                  {friend.major && friend.year
                    ? `${friend.major} • ${friend.year}`
                    : friend.major || friend.year || 'MSU Student'}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-msu-green-light">View Dossier</span>
                  <span className="text-msu-green-light group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
