'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, YearType } from '@/types/database'

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

export default function MyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      router.push('/onboarding')
      return
    }

    setProfile(profileData)
    setFormData({
      full_name: profileData.full_name,
      pronouns: profileData.pronouns || '',
      major: profileData.major || '',
      year: profileData.year || '',
      bio: profileData.bio || '',
      interests: profileData.interests || [],
      looking_for: profileData.looking_for || [],
      campus_area: profileData.campus_area || '',
    })
    setAvatarPreview(profileData.avatar_url)
    setLoading(false)
  }

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
    if (!avatarFile || !profile) return null

    const fileExt = avatarFile.name.split('.').pop()
    const filePath = `${profile.id}/avatar.${fileExt}`

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

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      let avatarUrl = profile.avatar_url

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        }
      }

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
          avatar_url: avatarUrl,
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile({
        ...profile,
        ...formData,
        avatar_url: avatarUrl,
      } as Profile)
      setSuccess('Profile updated successfully!')
      setEditing(false)
      setAvatarFile(null)
    } catch {
      setError('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 w-32 bg-gray-200 rounded-full mx-auto"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 relative">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-msu-green/5 blur-[100px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-msu-accent/5 blur-[120px] rounded-full -z-10" />

      {error && (
        <div className="glass-panel border-red-200/50 bg-red-50/30 text-red-700 px-6 py-4 rounded-2xl text-sm font-bold mb-8 animate-fade-in">
          {error}
        </div>
      )}

      {success && (
        <div className="glass-panel border-green-200/50 bg-green-50/30 text-green-700 px-6 py-4 rounded-2xl text-sm font-bold mb-8 animate-fade-in">
          {success}
        </div>
      )}

      <div className="card-prestige !p-0 overflow-hidden animate-fade-in">
        {/* Profile Header */}
        <div className="relative h-48 bg-msu-gradient">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          <div className="absolute top-6 right-8">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="btn-prestige !bg-white/20 !backdrop-blur-lg !border-white/30 hover:!bg-white/30 shadow-none !py-2 !px-4 !text-sm !text-white"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditing(false)
                    setFormData({
                      full_name: profile.full_name,
                      pronouns: profile.pronouns || '',
                      major: profile.major || '',
                      year: profile.year || '',
                      bio: profile.bio || '',
                      interests: profile.interests || [],
                      looking_for: profile.looking_for || [],
                      campus_area: profile.campus_area || '',
                    })
                    setAvatarPreview(profile.avatar_url)
                    setAvatarFile(null)
                  }}
                  className="btn-secondary-prestige !bg-black/20 !text-white !border-transparent !py-2 !px-4 !text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-prestige !bg-white !text-msu-green shadow-xl !py-2 !px-4 !text-sm font-black"
                >
                  {saving ? '...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-10 pb-12">
          {/* Avatar & Basic Info */}
          <div className="flex flex-col md:flex-row items-end gap-8 -mt-16 mb-12">
            <div className="relative group">
              <div
                onClick={() => editing && fileInputRef.current?.click()}
                className={`w-40 h-40 rounded-[2.5rem] bg-white p-2 shadow-2xl transition-all duration-500 overflow-hidden ${editing ? 'cursor-pointer hover:scale-105' : ''
                  }`}
              >
                <div className="w-full h-full rounded-[2rem] bg-gray-100 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">👤</span>
                  )}
                </div>
              </div>
              {editing && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-2 rounded-[2rem] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  <span className="text-white font-black text-xs uppercase tracking-widest">Update</span>
                </div>
              )}
              {editing && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              )}
            </div>

            <div className="flex-1 pb-2">
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">{formData.full_name}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {formData.pronouns && (
                  <span className="text-xs font-black uppercase tracking-widest text-[#c084fc] bg-msu-accent/5 px-3 py-1 rounded-full">{formData.pronouns}</span>
                )}
                <span className="text-gray-400 font-bold">
                  {formData.major && formData.year
                    ? `${formData.major} • ${formData.year}`
                    : formData.major || formData.year || 'MSU Student'}
                </span>
                {formData.campus_area && (
                  <span className="text-xs font-bold text-msu-green-light px-3 py-1 bg-msu-green/5 rounded-full border border-msu-green/10">📍 {formData.campus_area}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-12">
              {!editing ? (
                /* View mode bits */
                <>
                  <section className="animate-fade-in reveal-delay-1">
                    <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">About the Spartan</h3>
                    <p className="text-lg text-gray-600 font-medium leading-relaxed italic">
                      {profile.bio ? `"${profile.bio}"` : "This spartan hasn't written their bio yet... too busy winning probably!"}
                    </p>
                  </section>

                  <section className="animate-fade-in reveal-delay-2">
                    <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">The Selection (Interests)</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest) => (
                        <span key={interest} className="chip-prestige">{interest}</span>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                /* Edit mode fields */
                <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="input-prestige"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Pronouns</label>
                      <input
                        type="text"
                        value={formData.pronouns}
                        onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                        className="input-prestige"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Academic Year</label>
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value as YearType })}
                        className="input-prestige"
                      >
                        <option value="">Select year</option>
                        {YEARS.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Major</label>
                      <input
                        type="text"
                        value={formData.major}
                        onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                        className="input-prestige"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Campus Residential Area</label>
                      <select
                        value={formData.campus_area}
                        onChange={(e) => setFormData({ ...formData, campus_area: e.target.value })}
                        className="input-prestige"
                      >
                        <option value="">Select area</option>
                        {CAMPUS_AREAS.map((area) => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Legacy (Bio)</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="input-prestige min-h-[140px] resize-none"
                      maxLength={500}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-12">
              {!editing ? (
                <section className="animate-fade-in reveal-delay-3">
                  <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">Seeking Connection</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {profile.looking_for.map((item) => (
                      <div key={item} className="flex items-center gap-3 bg-msu-accent/5 p-4 rounded-2xl border border-msu-accent/10">
                        <span className="text-xl">🤝</span>
                        <span className="font-bold text-gray-700 text-sm tracking-tight">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="space-y-10 animate-fade-in">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Vibe Selection</label>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.map((interest) => (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={formData.interests.includes(interest) ? 'chip-prestige chip-prestige-active' : 'chip-prestige'}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Looking For...</label>
                    <div className="flex flex-wrap gap-2">
                      {LOOKING_FOR.map((item) => (
                        <button
                          key={item}
                          onClick={() => toggleLookingFor(item)}
                          className={formData.looking_for.includes(item) ? 'chip-prestige chip-prestige-active' : 'chip-prestige'}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
