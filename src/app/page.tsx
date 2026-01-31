import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-msu-green/5 blur-[120px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-msu-accent/5 blur-[150px] rounded-full -z-10 animate-pulse" />

      <nav className="flex justify-between items-center px-12 py-8 relative z-10 glass-nav border-none backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-msu-gradient rounded-xl flex items-center justify-center text-white font-black shadow-lg">S</div>
          <span className="text-2xl font-black text-prestige-gradient tracking-tighter">SpartanFinder</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="/login" className="text-xs font-black uppercase tracking-widest text-gray-600 hover:text-msu-green transition-colors">
            Log In
          </Link>
          <Link href="/signup" className="btn-prestige !py-3 !px-8 shadow-xl">
            Join Legacy
          </Link>
        </div>
      </nav>

      <main className="relative z-10 px-8 pt-32 pb-40 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3 bg-msu-green/5 px-6 py-2.5 rounded-full mb-10 border border-msu-green/10 animate-fade-in">
            <span className="w-2 h-2 bg-msu-green animate-pulse rounded-full"></span>
            <span className="text-msu-green text-[10px] font-black uppercase tracking-widest">The Official MSU Connection Hub</span>
          </div>

          <h1 className="text-7xl md:text-8xl font-black text-gray-900 tracking-tight leading-[0.9] mb-8 animate-fade-in reveal-delay-1">
            Forge Your <br />
            <span className="text-prestige-gradient">Spartan Legacy</span>
          </h1>

          <p className="text-xl text-gray-500 font-medium max-w-2xl mb-14 leading-relaxed animate-fade-in reveal-delay-2">
            The exclusive high-end network for Michigan State students. Find your study collective,
            lifestyle partners, and meaningful friendships within the MSU elite.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 animate-fade-in reveal-delay-3">
            <Link href="/signup" className="btn-prestige !px-12 !py-5 text-lg shadow-2xl hover:scale-105 transition-transform">
              Begin Discovery
            </Link>
            <Link href="/login" className="btn-secondary-prestige !px-12 !py-5 text-lg !bg-gray-50 !border-gray-100">
              Return to Vibe
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 w-full animate-fade-in reveal-delay-4">
            <div className="card-prestige group hover:-translate-y-2 transition-transform duration-500">
              <div className="w-14 h-14 bg-msu-green/5 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:bg-msu-gradient group-hover:text-white transition-colors duration-500">
                🎯
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3">Elite Matching</h3>
              <p className="text-gray-500 font-medium leading-relaxed">Our advanced algorithm identifies connections based on shared academic rigor and lifestyle vibes.</p>
            </div>

            <div className="card-prestige group hover:-translate-y-2 transition-transform duration-500">
              <div className="w-14 h-14 bg-msu-green/5 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:bg-msu-gradient group-hover:text-white transition-colors duration-500">
                🛡️
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3">Spartan Verified</h3>
              <p className="text-gray-500 font-medium leading-relaxed">Exclusively restricted to MSU verified students. A secure, prestigious environment for our community.</p>
            </div>

            <div className="card-prestige group hover:-translate-y-2 transition-transform duration-500">
              <div className="w-14 h-14 bg-msu-green/5 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:bg-msu-gradient group-hover:text-white transition-colors duration-500">
                💎
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3">Aesthetic Life</h3>
              <p className="text-gray-500 font-medium leading-relaxed">A meticulously designed interface that mirrors the excellence of the Michigan State University student body.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-gray-100 py-12 text-center">
        <p className="text-gray-300 text-[10px] font-black uppercase tracking-widest italic">Crafted with excellence for the Spartan elite</p>
      </footer>
    </div>
  );
}
