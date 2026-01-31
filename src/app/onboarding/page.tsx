'use client'

// Force dynamic rendering - this page uses Supabase which requires runtime env vars
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { YearType } from '@/types/database'

const INTERESTS = [
  'Basketball', 'Soccer', 'Football', 'Gaming', 'Music', 'Movies',
  'Reading', 'Hiking', 'Cooking', 'Photography', 'Art', 'Dance',
  'Fitness', 'Yoga', 'Running', 'Swimming', 'Tennis', 'Golf',
  'Coding', 'Startups', 'Finance', 'Marketing', 'Design', 'Writing',
  'Travel', 'Food', 'Fashion', 'Volunteering', 'Politics', 'Science'
]

const LOOKING_FOR = [
  'Friends', 'Study Partners', 'Gym Buddy', 'Roommate', 'Project Partners',
  'Sports Teams', 'Club Members', 'Mentors', 'Networking', 'Dating'
]

const YEARS: YearType[] = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad', 'Other']

const CAMPUS_AREAS = [
  'North Neighborhood', 'South Neighborhood', 'East Neighborhood',
  'Brody Neighborhood', 'River Trail Neighborhood', 'Off Campus'
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    full_name: '',
    pronouns: '',
    major: '',
    year: '' as YearType | '',
    bio: '',
    interests: [] as string[],
    looking_for: [] as string[],
    campus_area: '',
    avatar_url: '',
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email || null)
      } else {
        router.push('/login')
      }
    }
    getUser()
  }, [supabase, router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  const toggleLookingFor = (item: string) => {
    setFormData(prev => ({
      ...prev,
      looking_for: prev.looking_for.includes(item)
        ? prev.looking_for.filter(i => i !== item)
        : [...prev.looking_for, item]
    }))
  }

  const uploadAvatar = async () => {
    if (!avatarFile || !userId) return null

    const fileExt = avatarFile.name.split('.').pop()
    const filePath = `${userId}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return null
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!userId) return

    setLoading(true)
    setError('')

    try {
      let avatarUrl = formData.avatar_url

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        }
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          full_name: formData.full_name,
          pronouns: formData.pronouns || null,
          major: formData.major || null,
          year: formData.year || null,
          bio: formData.bio || null,
          interests: formData.interests,
          looking_for: formData.looking_for,
          campus_area: formData.campus_area || null,
          avatar_url: avatarUrl || null,
        })

      if (insertError) {
        // If profile exists, update instead
        if (insertError.code === '23505') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: formData.full_name,
              pronouns: formData.pronouns || null,
              major: formData.major || null,
              year: formData.year || null,
              bio: formData.bio || null,
              interests: formData.interests,
              looking_for: formData.looking_for,
              campus_area: formData.campus_area || null,
              avatar_url: avatarUrl || null,
            })
            .eq('id', userId)

          if (updateError) throw updateError
        } else {
          throw insertError
        }
      }

      router.push('/discover')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Failed to create profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const completionPercentage = () => {
    let completed = 0
    const total = 6
    if (formData.full_name) completed++
    if (formData.major) completed++
    if (formData.year) completed++
    if (formData.interests.length > 0) completed++
    if (formData.looking_for.length > 0) completed++
    if (avatarPreview) completed++
    return Math.round((completed / total) * 100)
  }

  return (
    <div className="min-h-screen bg-[#fdfdfd] py-20 px-4 overflow-hidden relative">
      {/* Background accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-msu-green/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-msu-accent/5 blur-[120px] rounded-full" />

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-black text-prestige-gradient mb-4 tracking-tight">
            Begin Your Journey
          </h1>
          <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">
            Step {step} of 3 <span className="mx-2">•</span> {completionPercentage()}% complete
          </p>

          {/* Progress bar */}
          <div className="mt-8 max-w-xs mx-auto flex gap-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${s <= step ? 'bg-msu-green shadow-[0_0_12px_rgba(24,69,59,0.3)]' : 'bg-gray-200'
                  }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="glass-panel border-red-200/50 bg-red-50/30 text-red-700 px-6 py-4 rounded-2xl text-sm font-bold mb-8 animate-fade-in">
            {error}
          </div>
        )}

        <div className="card-prestige animate-fade-in reveal-delay-1">
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">The Basics</h2>
                <p className="text-gray-500 text-sm font-medium">Let's start with who you are.</p>
              </div>

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-40 h-40 rounded-[2.5rem] bg-gray-50 flex items-center justify-center cursor-pointer hover:scale-105 transition-all duration-500 overflow-hidden border-2 border-dashed border-gray-200 hover:border-msu-green group relative"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <span className="text-4xl block mb-2 opacity-40 group-hover:opacity-100 transition-opacity">📸</span>
                      <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500 group-hover:text-msu-green">Select Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-msu-green/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold text-xs uppercase tracking-widest">Change</span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2 ml-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-prestige"
                    placeholder="E.g. Sparty D. Spartan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2 ml-1">
                    Pronouns
                  </label>
                  <input
                    type="text"
                    value={formData.pronouns}
                    onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                    className="input-prestige"
                    placeholder="he/his"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Year
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value as YearType })}
                    className="input-prestige"
                  >
                    <option value="">Choose your year</option>
                    {YEARS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2 ml-1">
                    Major
                  </label>
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="input-prestige"
                    placeholder="E.g. Computer Science"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2 ml-1">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="input-prestige min-h-[120px] resize-none"
                  placeholder="Tell your future friends something cool about yourself..."
                  maxLength={500}
                />
                <div className="flex justify-end mt-2">
                  <span className="text-[10px] font-black text-gray-300 tracking-tighter uppercase">{formData.bio.length} / 500</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!formData.full_name) {
                    setError('Please enter your name')
                    return
                  }
                  setError('')
                  setStep(2)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="btn-prestige w-full !py-4 text-lg"
              >
                Continue Adventure
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Vibe Check</h2>
                <p className="text-gray-500 text-sm font-medium">What makes you tick? Select your favorites.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={formData.interests.includes(interest) ? 'chip-prestige chip-prestige-active' : 'chip-prestige'}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="flex-1 btn-secondary-prestige"
                >
                  Back
                </button>
                <button
                  onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="flex-1 btn-prestige"
                >
                  Next Level
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Desired Connections</h2>
                <p className="text-gray-500 text-sm font-medium">What kind of squad are you looking to build?</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {LOOKING_FOR.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleLookingFor(item)}
                    className={formData.looking_for.includes(item) ? 'chip-prestige chip-prestige-active' : 'chip-prestige'}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="flex-1 btn-secondary-prestige"
                >
                  Previous
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 btn-prestige disabled:opacity-50"
                >
                  {loading ? 'Creating Legacy...' : 'Enter the Arena'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
