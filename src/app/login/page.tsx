'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Please enter email and password')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/discover')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-msu-green/5 blur-[100px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-msu-accent/5 blur-[120px] rounded-full -z-10 animate-pulse" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in">
        <Link href="/" className="flex flex-col items-center gap-4 group">
          <div className="w-16 h-16 bg-msu-gradient rounded-[1.5rem] flex items-center justify-center text-white text-3xl font-black shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-3">S</div>
          <h1 className="text-3xl font-black text-prestige-gradient tracking-tighter">SpartanFinder</h1>
        </Link>
        <p className="mt-2 text-center text-sm font-bold text-foreground-subtle uppercase tracking-widest">
          Sign in to your account
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in reveal-delay-1">
        <div className="card-prestige !p-10 shadow-2xl">
          {error && (
            <div className="alert-error-prestige mb-6">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-black text-foreground-subtle uppercase tracking-widest ml-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-prestige"
                placeholder="spartan@msu.edu"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-black text-foreground-subtle uppercase tracking-widest ml-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-prestige"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-prestige !py-4 shadow-xl disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-foreground-muted">
              Don't have an account?{' '}
              <Link href="/signup" className="font-bold text-msu-green hover:text-msu-green-light transition-colors">
                Sign up
              </Link>
            </p>
          </div>

          <p className="mt-8 text-center text-xs font-black uppercase tracking-widest text-foreground-subtle">
            Michigan State University
          </p>
        </div>
      </div>
    </div>
  )
}
