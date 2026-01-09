import { useState, useEffect } from 'react';
import { Menu, X, LogOut, LogIn, ChevronRight } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userEmail?: string;
  onLogout?: () => void;
  isAdmin?: boolean;
}

export function Navigation({ currentPage, onNavigate, userEmail, onLogout, isAdmin }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Home', id: 'home' },
    { label: 'Features', id: 'features' },
    { label: 'Results', id: 'results' },
    { label: 'Practice Tests', id: 'practice' },
    { label: 'Score Calculator', id: 'calculator' },
    { label: 'Review', id: 'review' },
    { label: 'FAQ', id: 'faq' },
    ...(isAdmin ? [{ label: 'Admin', id: 'admin' }] : []),
  ];

  return (
    <>
      <header
        className={`fixed top-4 left-4 right-4 z-[100] transition-all duration-500 max-w-7xl mx-auto rounded-2xl ${isScrolled ? 'glass-panel py-3 px-6' : 'bg-transparent py-4 px-6'
          }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 group"
          >
            <div className="relative w-12 h-12 flex items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300 border border-white/10">
              <img src="/logo.jpg" alt="SAT Valley Logo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white flex flex-col leading-none">
              <span>SAT<span className="text-indigo-400">Valley</span></span>
              <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase mt-0.5">Beta</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300
                  ${currentPage === item.id
                    ? 'text-white bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {userEmail ? (
              <div className="flex items-center gap-3">

                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('auth')}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm transition-all hover:bg-indigo-500 hover:scale-105 shadow-lg shadow-indigo-500/25"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-xl md:hidden flex flex-col pt-24 px-6 space-y-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsMenuOpen(false);
              }}
              className={`text-2xl font-bold text-left py-4 border-b border-white/5 ${currentPage === item.id ? 'text-indigo-400' : 'text-slate-400'
                }`}
            >
              {item.label}
            </button>
          ))}

        </div>
      )}
    </>
  );
}
