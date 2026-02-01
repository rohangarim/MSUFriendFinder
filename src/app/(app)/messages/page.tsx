'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Conversation, Message } from '@/types/database'

interface ConversationWithDetails {
  conversation: Conversation
  displayName: string
  displayAvatar: string | null
  participants: Profile[]
  lastMessage: Message | null
  unreadCount: number
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [friends, setFriends] = useState<Profile[]>([])
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

    // Fetch 1-on-1 conversations (where user is participant_a or participant_b)
    const { data: directConvData } = await supabase
      .from('conversations')
      .select('*')
      .eq('is_group', false)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    // Fetch group conversations (where user is a member)
    const { data: membershipData } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id)

    const groupConvIds = membershipData?.map(m => m.conversation_id) || []

    let groupConvData: Conversation[] = []
    if (groupConvIds.length > 0) {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('is_group', true)
        .in('id', groupConvIds)
        .order('updated_at', { ascending: false })
      groupConvData = data || []
    }

    const allConvs = [...(directConvData || []), ...groupConvData]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    // Build conversation details
    const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
      allConvs.map(async (conv) => {
        let displayName = ''
        let displayAvatar: string | null = null
        let participants: Profile[] = []

        if (conv.is_group) {
          // Group chat - fetch all members
          displayName = conv.group_name || 'Group Chat'
          displayAvatar = conv.group_avatar_url

          const { data: members } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', conv.id)

          if (members && members.length > 0) {
            const memberIds = members.map(m => m.user_id).filter(id => id !== user.id)
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('id', memberIds)
            participants = profiles || []

            // If no group name, use participant names
            if (!conv.group_name && participants.length > 0) {
              displayName = participants.slice(0, 3).map(p => p.full_name.split(' ')[0]).join(', ')
              if (participants.length > 3) {
                displayName += ` +${participants.length - 3}`
              }
            }
          }
        } else {
          // 1-on-1 chat
          const otherUserId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .single()

          if (profileData) {
            displayName = profileData.full_name
            displayAvatar = profileData.avatar_url
            participants = [profileData]
          }
        }

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
          displayName,
          displayAvatar,
          participants,
          lastMessage: messageData as Message | null,
          unreadCount: count || 0,
        }
      })
    )

    setConversations(conversationsWithDetails)
    setLoading(false)
  }

  const fetchFriends = async () => {
    if (!currentUserId) return

    // Fetch friendships
    const { data: friendshipsA } = await supabase
      .from('friendships')
      .select('user_b')
      .eq('user_a', currentUserId)

    const { data: friendshipsB } = await supabase
      .from('friendships')
      .select('user_a')
      .eq('user_b', currentUserId)

    const friendIds = [
      ...(friendshipsA?.map(f => f.user_b) || []),
      ...(friendshipsB?.map(f => f.user_a) || []),
    ]

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds)

      setFriends(profiles || [])
    }
  }

  const openCreateGroup = () => {
    setShowCreateGroup(true)
    fetchFriends()
  }

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const createGroupChat = async () => {
    if (selectedFriends.length < 2 || !currentUserId) return

    setCreating(true)
    setError(null)

    const { data: conversationId, error: rpcError } = await supabase.rpc('create_group_chat', {
      p_name: groupName.trim() || null,
      p_member_ids: selectedFriends,
    })

    if (rpcError) {
      console.error('Group chat creation error:', rpcError)
      setError(`Failed to create group: ${rpcError.message}`)
      setCreating(false)
      return
    }

    if (conversationId) {
      setShowCreateGroup(false)
      setSelectedFriends([])
      setGroupName('')
      setError(null)
      router.push(`/messages/${conversationId}`)
    } else {
      setError('Failed to create group chat')
    }

    setCreating(false)
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
            <div key={i} className="flex items-center gap-4 p-4 bg-background-elevated rounded-2xl">
              <div className="w-14 h-14 bg-foreground-subtle/30 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-foreground-subtle/30 rounded w-1/3 mb-2" />
                <div className="h-3 bg-foreground-subtle/30 rounded w-2/3" />
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

      <div className="flex justify-between items-end mb-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Messages</h1>
          <p className="text-foreground-muted font-bold text-sm mt-1">Chat with your Spartan friends</p>
        </div>
        <button
          onClick={openCreateGroup}
          className="btn-prestige !py-2 !px-4 !text-sm"
        >
          + New Group
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="card-prestige text-center py-16 animate-fade-in">
          <span className="text-6xl block mb-4">💬</span>
          <h3 className="text-xl font-black text-foreground mb-2">No conversations yet</h3>
          <p className="text-foreground-muted font-medium mb-6">
            Start chatting with your friends!
          </p>
          <Link href="/friends" className="btn-prestige inline-block">
            View Friends
          </Link>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {conversations.map(({ conversation, displayName, displayAvatar, participants, lastMessage, unreadCount }) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className="card-prestige !p-4 flex items-center gap-4 hover:scale-[1.02] transition-transform"
            >
              {/* Avatar */}
              <div className="relative">
                {conversation.is_group ? (
                  <div className="w-14 h-14 rounded-full bg-msu-green/10 flex items-center justify-center">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-2xl">👥</span>
                    )}
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-background-elevated overflow-hidden flex items-center justify-center">
                    {displayAvatar ? (
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                )}
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-msu-green rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-black">{unreadCount}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-foreground truncate ${unreadCount > 0 ? 'font-black' : ''}`}>
                      {displayName || 'Unknown'}
                    </h3>
                    {conversation.is_group && (
                      <span className="text-xs font-bold text-msu-green bg-msu-green/10 px-2 py-0.5 rounded-full">
                        Group
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <span className="text-xs text-foreground-subtle font-medium flex-shrink-0">
                      {formatTime(lastMessage.created_at)}
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate ${unreadCount > 0 ? 'text-foreground font-medium' : 'text-foreground-muted'}`}>
                  {lastMessage ? (
                    lastMessage.sender_id === currentUserId ? (
                      <span className="text-foreground-subtle">You: </span>
                    ) : conversation.is_group ? (
                      <span className="text-foreground-subtle">
                        {participants.find(p => p.id === lastMessage.sender_id)?.full_name?.split(' ')[0]}:
                      </span>
                    ) : null
                  ) : null}
                  {lastMessage?.content || 'Start the conversation!'}
                </p>
              </div>

              {/* Arrow */}
              <div className="text-foreground-subtle">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Chat Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateGroup(false)}>
          <div className="bg-background-elevated rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-glass-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-foreground">Create Group Chat</h2>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="text-foreground-subtle hover:text-foreground-muted"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (optional)"
                className="input-prestige mt-4"
              />
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <h3 className="text-sm font-black text-foreground-subtle uppercase tracking-widest mb-4">
                Select Friends ({selectedFriends.length} selected)
              </h3>

              {friends.length === 0 ? (
                <p className="text-center text-foreground-subtle py-8">
                  Add friends first to create a group chat!
                </p>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriendSelection(friend.id)}
                      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-colors ${selectedFriends.includes(friend.id)
                          ? 'bg-msu-green/10 border-2 border-msu-green'
                          : 'bg-background-elevated border-2 border-transparent hover:bg-background'
                        }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-background-elevated overflow-hidden flex-shrink-0">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt={friend.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg flex items-center justify-center h-full">👤</span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-bold text-foreground">{friend.full_name}</h4>
                        <p className="text-sm text-foreground-muted">{friend.major || 'MSU Student'}</p>
                      </div>
                      {selectedFriends.includes(friend.id) && (
                        <span className="text-msu-green font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-glass-border">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}
              <button
                onClick={createGroupChat}
                disabled={selectedFriends.length < 2 || creating}
                className="btn-prestige w-full disabled:opacity-50"
              >
                {creating ? 'Creating...' : `Create Group (${selectedFriends.length} members)`}
              </button>
              <p className="text-xs text-foreground-subtle text-center mt-2">
                Select at least 2 friends to create a group
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
