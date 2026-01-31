'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email')
      return
    }

    if (!email.endsWith('@msu.edu')) {
      setError('Please use your @msu.edu email')
      return
    }

    setError('')
    setMessage('')
    setLoading(true)

    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Failed to dispatch code')
      setLoading(false)
      return
    }

    setStep('otp')
    setMessage('Access code sent to your MSU inbox.')
    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: otpToken }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Invalid or expired code')
      setLoading(false)
      return
    }

    // Redirect to onboarding for new users
    // The bridge handles user creation automatically
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-msu-green/5 blur-[100px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[530px] h-[530px] bg-msu-accent/5 blur-[120px] rounded-full -z-10 animate-pulse" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in">
        <Link href="/" className="flex flex-col items-center gap-4 group">
          <div className="w-16 h-16 bg-msu-gradient rounded-[1.5rem] flex items-center justify-center text-white text-3xl font-black shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-3">S</div>
          <h1 className="text-3xl font-black text-prestige-gradient tracking-tighter">SpartanFinder</h1>
        </Link>
        <p className="mt-2 text-center text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
          {step === 'otp' ? `Code sent to ${email}` : 'Exclusive Access for Validated Spartans'}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in reveal-delay-1">
        <div className="card-prestige !p-10 shadow-2xl">
          {error && (
            <div className="alert-error-prestige">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          {message && (step === 'otp') && !error && (
            <div className="alert-success-prestige">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {message}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-8">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                  MSU Email Address
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

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-prestige !py-4 shadow-xl disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Get Access Code'}
                </button>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="space-y-2">
                <label htmlFor="otp" className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                  Enter 6-Digit Code
                </label>
                <input
                  id="otp"
                  type="text"
                  required
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  className="input-prestige text-center text-2xl tracking-[0.5em] font-black"
                  placeholder="••••••"
                  maxLength={6}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-prestige !py-4 shadow-xl disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full mt-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-msu-green transition-colors"
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}

          <p className="mt-10 text-center text-xs font-black uppercase tracking-widest text-gray-300">
            Already have an account?{' '}
            <Link href="/login" className="text-msu-green hover:underline">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
