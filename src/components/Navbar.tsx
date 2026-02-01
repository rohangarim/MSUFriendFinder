'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { href: '/discover', label: 'Discover' },
    { href: '/requests', label: 'Requests' },
    { href: '/friends', label: 'Friends' },
    { href: '/messages', label: 'Messages' },
  ]

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/discover" className="flex items-center gap-2 group transition-all duration-300">
            <div className="w-10 h-10 bg-msu-gradient rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <span className="text-white font-black text-xl">S</span>
            </div>
            <span className="text-2xl font-black text-prestige-gradient tracking-tight">
              SpartanFinder
            </span>
          </Link>

          <div className="flex items-center gap-8">
            <div className="hidden md:flex gap-1 justify-center items-center">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-5 py-2 rounded-xl font-bold transition-all duration-300 relative group overflow-hidden ${pathname === item.href
                      ? 'text-msu-green'
                      : 'text-gray-600 hover:text-msu-green-light font-black'
                    }`}
                >
                  <span className="relative z-10">{item.label}</span>
                  {pathname === item.href && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-msu-green rounded-full shadow-[0_0_12px_rgba(24,69,59,0.5)]" />
                  )}
                  <div className="absolute inset-0 bg-msu-green/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-6">
              <Link
                href="/profile"
                className="group flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-transparent group-hover:border-msu-green transition-all overflow-hidden flex items-center justify-center">
                  <span className="text-gray-400 group-hover:text-msu-green">👤</span>
                </div>
                <span className="hidden sm:inline font-bold text-gray-700 group-hover:text-msu-green transition-colors">
                  My Profile
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="btn-secondary-prestige !px-4 !py-2 !text-xs !bg-transparent !border-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-2 pb-4 overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all duration-300 ${pathname === item.href
                  ? 'bg-msu-green text-white shadow-lg'
                  : 'bg-white/50 text-gray-600 border border-white/50'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
