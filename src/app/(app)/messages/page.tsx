'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Conversation, Message } from '@/types/database'

interface ConversationWithDetails {
  conversation: Conversation
  otherUser: Profile
  lastMessage: Message | null
  unreadCount: number
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUserId(user.id)

    // Fetch all conversations for this user
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    if (convError || !convData) {
      console.error('Error fetching conversations:', convError)
      setLoading(false)
      return
    }

    // For each conversation, fetch the other user's profile and last message
    const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
      convData.map(async (conv) => {
        const otherUserId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a

        // Fetch other user's profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single()

        // Fetch last message
        const { data: messageData } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Count unread messages
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .is('read_at', null)

        return {
          conversation: conv,
          otherUser: profileData as Profile,
          lastMessage: messageData as Message | null,
          unreadCount: count || 0,
        }
      })
    )

    setConversations(conversationsWithDetails)
    setLoading(false)
  }

  // Subscribe to new messages
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('messages-list')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch conversations when a new message arrives
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-gray-100 rounded-2xl">
              <div className="w-14 h-14 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 relative">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-msu-green/5 blur-[100px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-msu-accent/5 blur-[120px] rounded-full -z-10" />

      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Messages</h1>
        <p className="text-gray-500 font-bold text-sm mt-1">Chat with your Spartan friends</p>
      </div>

      {conversations.length === 0 ? (
        <div className="card-prestige text-center py-16 animate-fade-in">
          <span className="text-6xl block mb-4">💬</span>
          <h3 className="text-xl font-black text-gray-800 mb-2">No conversations yet</h3>
          <p className="text-gray-500 font-medium mb-6">
            Start chatting with your friends!
          </p>
          <Link href="/friends" className="btn-prestige inline-block">
            View Friends
          </Link>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {conversations.map(({ conversation, otherUser, lastMessage, unreadCount }) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className="card-prestige !p-4 flex items-center gap-4 hover:scale-[1.02] transition-transform"
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {otherUser?.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-msu-green rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-black">{unreadCount}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`font-bold text-gray-900 truncate ${unreadCount > 0 ? 'font-black' : ''}`}>
                    {otherUser?.full_name || 'Unknown User'}
                  </h3>
                  {lastMessage && (
                    <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                      {formatTime(lastMessage.created_at)}
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                  {lastMessage ? (
                    lastMessage.sender_id === currentUserId ? (
                      <span className="text-gray-400">You: </span>
                    ) : null
                  ) : null}
                  {lastMessage?.content || 'Start the conversation!'}
                </p>
              </div>

              {/* Arrow */}
              <div className="text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
