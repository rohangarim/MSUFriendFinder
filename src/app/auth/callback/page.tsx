'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()
      // Check for tokens in the hash fragment (implicit flow from magic link)
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          // Set the session using the tokens from the hash
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            setError(sessionError.message)
            return
          }

          // Check if user has a profile
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', user.id)
              .single()

            // Use hard navigation to ensure cookies are properly applied
            if (!profile) {
              window.location.href = '/onboarding'
            } else {
              window.location.href = '/discover'
            }
            return
          }
        }
      }

      // Check for code in query params (PKCE flow)
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        // For PKCE flow, we need to exchange the code
        // This is handled by Supabase automatically when using the client
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('Exchange error:', exchangeError)
          setError(exchangeError.message)
          return
        }

        // Check if user has a profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single()

          // Use hard navigation to ensure cookies are properly applied
          if (!profile) {
            window.location.href = '/onboarding'
          } else {
            window.location.href = '/discover'
          }
          return
        }
      }

      // No tokens or code found
      setError('Authentication failed. Please try again.')
      setTimeout(() => { window.location.href = '/login' }, 2000)
    }

    handleCallback()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <p className="text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-msu-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}
