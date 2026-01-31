export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'canceled'

export type YearType = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Grad' | 'Other'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string
          username: string | null
          pronouns: string | null
          major: string | null
          year: YearType | null
          bio: string | null
          interests: string[]
          looking_for: string[]
          campus_area: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name: string
          username?: string | null
          pronouns?: string | null
          major?: string | null
          year?: YearType | null
          bio?: string | null
          interests?: string[]
          looking_for?: string[]
          campus_area?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string
          username?: string | null
          pronouns?: string | null
          major?: string | null
          year?: YearType | null
          bio?: string | null
          interests?: string[]
          looking_for?: string[]
          campus_area?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      friend_requests: {
        Row: {
          id: string
          from_user: string
          to_user: string
          status: FriendRequestStatus
          note: string | null
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          from_user: string
          to_user: string
          status?: FriendRequestStatus
          note?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          from_user?: string
          to_user?: string
          status?: FriendRequestStatus
          note?: string | null
          created_at?: string
          responded_at?: string | null
        }
      }
      friendships: {
        Row: {
          id: string
          user_a: string
          user_b: string
          created_at: string
        }
        Insert: {
          id?: string
          user_a: string
          user_b: string
          created_at?: string
        }
        Update: {
          id?: string
          user_a?: string
          user_b?: string
          created_at?: string
        }
      }
    }
    Functions: {
      accept_friend_request: {
        Args: {
          p_request_id: string
        }
        Returns: undefined
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type FriendRequest = Database['public']['Tables']['friend_requests']['Row']
export type Friendship = Database['public']['Tables']['friendships']['Row']
