'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import MessageBubble from '@/components/MessageBubble'
import type { Profile, Message } from '@/types/database'

export default function ChatPage() {
  const params = useParams()
  const conversationId = params.conversationId as string
  const router = useRouter()
  const supabase = createClient()

  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    fetchChatData()
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchChatData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUserId(user.id)

    // Fetch conversation to verify access
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !convData) {
      console.error('Conversation not found')
      router.push('/messages')
      return
    }

    // Verify user is a participant
    if (convData.participant_a !== user.id && convData.participant_b !== user.id) {
      router.push('/messages')
      return
    }

    // Get other user's profile
    const otherUserId = convData.participant_a === user.id ? convData.participant_b : convData.participant_a
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId)
      .single()

    setOtherUser(profileData as Profile)

    // Fetch messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    setMessages(messagesData || [])
    setLoading(false)

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null)
  }

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

          // Mark as read if from other user
          if (newMsg.sender_id !== currentUserId) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId || sending) return

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: messageContent,
    })

    if (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent) // Restore message on error
    }

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    setSending(false)
    inputRef.current?.focus()
  }

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`animate-pulse flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
              <div className={`h-12 ${i % 2 === 0 ? 'bg-msu-green/20' : 'bg-gray-200'} rounded-2xl w-48`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-100 bg-white/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href={`/profile/${otherUser?.id}`} className="flex items-center gap-3 flex-1 group">
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
              {otherUser?.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg flex items-center justify-center h-full">👤</span>
              )}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 group-hover:text-msu-green transition-colors">
                {otherUser?.full_name}
              </h2>
              <p className="text-xs text-gray-500">{otherUser?.major || 'MSU Student'}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">👋</span>
            <p className="text-gray-500 font-medium">Say hi to {otherUser?.full_name?.split(' ')[0]}!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
              senderAvatar={message.sender_id !== currentUserId ? otherUser?.avatar_url || undefined : undefined}
              senderName={message.sender_id !== currentUserId ? otherUser?.full_name : undefined}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <form onSubmit={sendMessage} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-full bg-gray-100 border-0 focus:ring-2 focus:ring-msu-green/30 focus:bg-white transition-all font-medium"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-12 h-12 rounded-full bg-msu-gradient text-white flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition-opacity shadow-lg"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
