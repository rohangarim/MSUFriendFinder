import type { Message } from '@/types/database'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  senderAvatar?: string
  senderName?: string
}

export default function MessageBubble({ message, isOwn, senderAvatar, senderName }: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 self-end">
          {senderAvatar ? (
            <img src={senderAvatar} alt={senderName || 'User'} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm flex items-center justify-center h-full">👤</span>
          )}
        </div>
      )}
      <div
        className={`max-w-[70%] px-4 py-3 ${
          isOwn
            ? 'bg-msu-gradient text-white rounded-2xl rounded-br-md'
            : 'bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
        }`}
      >
        <p className="text-sm font-medium break-words whitespace-pre-wrap">{message.content}</p>
        <span className={`text-[10px] mt-1 block ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}
