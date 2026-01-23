import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { Navigation } from './components/Navigation';
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
import { supabase } from './lib/supabase';
import { LiquidBackground } from './components/LiquidBackground';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentParams, setCurrentParams] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [olympiadVerified, setOlympiadVerified] = useState(false);
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
        return <AuthPage />;

      case 'practice':
        if (!user) return <AuthPage />;
        return <PracticeTestsPage onNavigate={handleNavigate} />;
      case 'olympiad':
        if (!user) return <AuthPage />;
        if (!olympiadVerified && !adminUnlocked) return <OlympiadAuthPage onSuccess={() => setOlympiadVerified(true)} />;
        return <OlympiadPage onNavigate={handleNavigate} user={user} isAdmin={adminUnlocked} />;
      case 'test-session':
        if (!user) return <AuthPage />;
        return <TestSessionPage testId={currentParams?.testId} onNavigate={handleNavigate} user={user} />;
      case 'review':
        if (!user) return <AuthPage />;
        return <ReviewPage user={user} onNavigate={handleNavigate} />;
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

  return (
    <div className="min-h-screen bg-transparent text-foreground antialiased relative selection:bg-indigo-500/30">
      <LiquidBackground />
      {currentPage !== 'test-session' && (
        <Navigation
          currentPage={currentPage}
          onNavigate={handleNavigate}
          userEmail={user?.email || undefined}
          onLogout={handleLogout}
          isAdmin={adminUnlocked}
        />
      )}
      <main className="relative z-10">{renderPage()}</main>
      {currentPage !== 'test-session' && <Footer onNavigate={handleNavigate} />}
    </div>
  );
}
