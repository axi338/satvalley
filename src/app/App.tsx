import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { ChevronRight } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { HomePage } from './components/pages/HomePage';
import { FeaturesPage } from './components/pages/FeaturesPage';
import { FAQPage } from './components/pages/FAQPage';
import { ResultsPage } from './components/pages/ResultsPage';
import { CalculatorPage } from './components/pages/CalculatorPage';
import { PracticeTestsPage } from './components/pages/PracticeTestsPage';
import { ReviewPage } from './components/pages/ReviewPage';
import { AdminPage } from './components/pages/AdminPage';
import { AuthPage } from './components/pages/AuthPage';
import { TestSessionPage } from './components/pages/TestSessionPage';
import { OlympiadPage } from './components/pages/OlympiadPage';
import { OlympiadAdminPage } from './components/pages/OlympiadAdminPage';
import { OlympiadAuthPage } from './components/pages/OlympiadAuthPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { ScoreHistoryPage } from './components/pages/ScoreHistoryPage';
import { VocabularyPage } from './components/pages/VocabularyPage';
import { supabase } from './lib/supabase';
import { LiquidBackground } from './components/LiquidBackground';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentParams, setCurrentParams] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [olympiadVerified, setOlympiadVerified] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const adminPasscode = ((import.meta as any).env.VITE_ADMIN_PASSCODE || '882336201').toString();

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("DEBUG: Current session check", session);
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`DEBUG: Auth State Changed Event: ${event}`, session);
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN') {
        setCurrentPage('dashboard');
      } else if (event === 'SIGNED_OUT') {
        setCurrentPage('home');
      }
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Double check olympiad verification status when user is loaded
  useEffect(() => {
    if (user && !olympiadVerified) {
      const checkStatus = async () => {
        const { data } = await supabase.from('olympiad_profiles').select('phone_verified').eq('id', user.id).maybeSingle();
        if (data?.phone_verified) {
          setOlympiadVerified(true);
        }
      };
      checkStatus();
    }
  }, [user, olympiadVerified]);

  const handleLogout = async () => {
    console.log("DEBUG: handleLogout called");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log("DEBUG: Sign out successful");
    } catch (err) {
      console.error("DEBUG: Sign out failed", err);
    }
  };

  const handleNavigate = (page: string, params?: any) => {
    if (page === 'admin' && !adminUnlocked) {
      if (!adminPasscode) {
        window.alert('Admin passcode is not set. Please add VITE_ADMIN_PASSCODE in your .env.local.');
        return;
      }
      const input = window.prompt('Enter admin passcode');
      if (input === adminPasscode) {
        setAdminUnlocked(true);
        setCurrentPage('admin');
      } else if (input !== null) {
        window.alert('Invalid passcode');
      }
      return;
    }
    setCurrentPage(page);
    setCurrentParams(params || null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'features':
        return <FeaturesPage />;
      case 'faq':
        return <FAQPage />;
      case 'results':
        return <ResultsPage />;
      case 'calculator':
        return <CalculatorPage />;
      case 'auth':
        return <AuthPage onSuccess={() => setCurrentPage('dashboard')} />;

      case 'dashboard':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('dashboard')} />;
        return <DashboardPage user={user} onNavigate={handleNavigate} />;
      case 'history':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('history')} />;
        return <ScoreHistoryPage user={user} onNavigate={handleNavigate} />;
      case 'vocabulary':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('vocabulary')} />;
        return <VocabularyPage user={user} />;
      case 'practice':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('practice')} />;
        return <PracticeTestsPage onNavigate={handleNavigate} user={user} />;
      case 'olympiad':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('olympiad')} />;
        if (!olympiadVerified && !adminUnlocked) return <OlympiadAuthPage onSuccess={() => setOlympiadVerified(true)} />;
        return <OlympiadPage onNavigate={handleNavigate} user={user} isAdmin={adminUnlocked} />;
      case 'test-session':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('test-session')} />;
        return <TestSessionPage testId={currentParams?.testId} onNavigate={handleNavigate} user={user} />;
      case 'review':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('review')} />;
        return <ReviewPage user={user} onNavigate={handleNavigate} params={currentParams} />;
      case 'admin':
        return adminUnlocked ? <AdminPage /> : <HomePage onNavigate={handleNavigate} />;
      case 'admin-olympiad':
        return adminUnlocked ? <OlympiadAdminPage /> : <HomePage onNavigate={handleNavigate} />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_#6366f1]" />
            </div>
          </div>
          <p className="text-sm font-bold text-indigo-200/60 uppercase tracking-[0.3em]">Synchronizing...</p>
        </div>
      </div>
    );
  }

  const isAppMode = user && !['home', 'features', 'faq', 'auth'].includes(currentPage);
  const isTestSession = currentPage === 'test-session';

  return (
    <div className="min-h-screen bg-transparent text-foreground antialiased relative selection:bg-indigo-500/30">
      <LiquidBackground />
      {!isAppMode && !isTestSession && (
        <Navigation
          currentPage={currentPage}
          onNavigate={handleNavigate}
          userEmail={user?.email || undefined}
          onLogout={handleLogout}
          isAdmin={adminUnlocked}
        />
      )}

      {isAppMode && !isTestSession ? (
        <div className="flex min-h-screen">
          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigate}
            user={user}
            onLogout={handleLogout}
            isVisible={isSidebarVisible}
            isCollapsed={isSidebarCollapsed}
            onToggleVisibility={() => setIsSidebarVisible(!isSidebarVisible)}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
          <main
            className={`flex-1 transition-all duration-300 relative z-10 ${!isSidebarVisible ? 'ml-0' : (isSidebarCollapsed ? 'ml-20' : 'ml-64')
              }`}
          >
            {!isSidebarVisible && (
              <button
                onClick={() => setIsSidebarVisible(true)}
                className="fixed top-6 left-6 z-[110] group flex items-center gap-3"
                title="Show Sidebar"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-[0_0_20px_rgba(79,70,223,0.4)] hover:scale-110 transition-all duration-300 active:scale-95">
                    {user?.email?.[0].toUpperCase() || 'S'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-400 border-2 border-[#020617] animate-pulse" />
                </div>
                <div className="px-4 py-2 rounded-xl bg-[#020617]/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                  Open Menu
                </div>
              </button>
            )}
            {renderPage()}
          </main>
        </div>
      ) : (
        <main className="relative z-10">{renderPage()}</main>
      )}

      {!isAppMode && !isTestSession && <Footer onNavigate={handleNavigate} />}
    </div>
  );
}
