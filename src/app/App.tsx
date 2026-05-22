import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { ChevronRight } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { Sidebar } from './components/Sidebar';
import { ResultsMarquee } from './components/ResultsMarquee';
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
import { ProfilePage } from './components/pages/ProfilePage';
import { supabase } from './lib/supabase';
import { LiquidBackground } from './components/LiquidBackground';
import { ImportDashboard } from './components/pages/ImportDashboard';
import { NewImport } from './components/pages/NewImport';
import { ImportReview } from './components/pages/ImportReview';
import { OnboardingPage } from './components/pages/OnboardingPage';
import { ClassDashboardPage } from './components/pages/ClassDashboardPage';
import { TeacherPage } from './components/pages/TeacherPage';
import { TeacherSignupPage } from './components/pages/TeacherSignupPage';
import { FormattingReview } from './components/pages/FormattingReview';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentParams, setCurrentParams] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(() => sessionStorage.getItem('adminUnlocked') === 'true');
  const [olympiadVerified, setOlympiadVerified] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const adminPasscode = ((import.meta as any).env.VITE_ADMIN_PASSCODE || '882336201').toString();

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    const initializeAuth = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      console.log("DEBUG: Initializing Auth. Code in URL:", !!code);

      try {
        if (code) {
          console.log("DEBUG: Exchanging code for session...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error("DEBUG: Code exchange error:", error);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("DEBUG: Initial session check result:", { hasSession: !!session, error: sessionError });

        const newUser = session?.user ?? null;
        setUser(newUser);

        if (newUser) {
          console.log("DEBUG: User detected, setting dashboard");
          setCurrentPage('dashboard');
        }
      } catch (err) {
        console.error("DEBUG: Auth init failed:", err);
      } finally {
        setAuthReady(true);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`DEBUG: Auth State Event: ${event}`, {
        email: session?.user?.email,
        currentPage
      });

      const newUser = session?.user ?? null;
      setUser(newUser);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (newUser) {
          setCurrentPage(prevPage => (prevPage === 'home' || prevPage === 'auth') ? 'dashboard' : prevPage);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentPage('home');
      }
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Double check olympiad verification status and admin status when user is loaded
  useEffect(() => {
    if (user) {
      // Admin Check
      const adminEmails = [
        'ahrorbek360@gmail.com',
        'ahldnibrohimov@gmail.com',
        'ibroximovaxliddin@gmail.com',
        'gptr3654@gmail.com',
        'ibroximovaxliddin6.5@gmail.com'
      ];
      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        setAdminUnlocked(true);
        sessionStorage.setItem('adminUnlocked', 'true');
      }

      const checkStatus = async () => {
        const { data } = await supabase.from('olympiad_profiles').select('phone_verified').eq('id', user.id).maybeSingle();
        if (data?.phone_verified) {
          setOlympiadVerified(true);
        }
      };
      checkStatus();
    }
  }, [user]);

  // Check if profile is complete
  useEffect(() => {
    async function checkProfile() {
      if (!user) {
        setIsProfileComplete(null);
        return;
      }
      try {
        // First validate the session is still active to avoid spurious CORS/401 errors
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Session gone — don't show onboarding, just wait for auth state change
          setIsProfileComplete(null);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no row found (new user). Any other error is likely a network/auth issue.
          // Don't block the user with onboarding on a transient error.
          console.warn("Profile fetch error (non-fatal):", error.message || error);
          // If it looks like an auth/network error, assume complete to avoid blocking them
          if (!error.code || error.code === 'CORS' || error.status === 401 || error.status === 0) {
            setIsProfileComplete(true); // Optimistically allow through on auth errors
            return;
          }
        }

        if (data) {
          setProfile(data);
        }

        // Profile is considered complete if they've already done onboarding.
        // We check the `onboarding_complete` flag first, then fall back to
        // checking if `full_name` exists (for backward compatibility).
        if (data && (data.onboarding_complete === true || data.full_name)) {
          setIsProfileComplete(true);
        } else {
          setIsProfileComplete(false);
        }
      } catch (err) {
        console.error("Profile check error:", err);
        // On network errors, don't block the user — let them through
        setIsProfileComplete(true);
      }
    }

    checkProfile();
  }, [user]);

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    try {
      // Clear immediately for better UX
      setUser(null);
      setIsProfileComplete(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error("DEBUG: Sign out failed", err);
      // Ensure we are logged out locally even if remote call fails
      setUser(null);
      setIsProfileComplete(null);
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
        sessionStorage.setItem('adminUnlocked', 'true');
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
    if (user && isProfileComplete === false) {
      return <OnboardingPage user={user} onComplete={() => setIsProfileComplete(true)} />;
    }

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
        return <DashboardPage user={user} profile={profile} onNavigate={handleNavigate} />;
      case 'history':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('history')} />;
        return <ScoreHistoryPage user={user} onNavigate={handleNavigate} />;
      case 'vocabulary':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('vocabulary')} />;
        return <VocabularyPage user={user} />;
      case 'profile':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('profile')} />;
        return <ProfilePage user={user} profile={profile} onProfileUpdate={refreshProfile} />;
      case 'classes':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('classes')} />;
        return <ClassDashboardPage user={user} profile={null} onNavigate={handleNavigate} />;
      case 'practice':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('practice')} />;
        return <PracticeTestsPage onNavigate={handleNavigate} user={user} profile={profile} />;
      case 'olympiad':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('olympiad')} />;
        if (!olympiadVerified && !adminUnlocked) return <OlympiadAuthPage onSuccess={() => setOlympiadVerified(true)} />;
        return <OlympiadPage onNavigate={handleNavigate} user={user} isAdmin={adminUnlocked} />;
      case 'test-session':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('test-session')} />;
        return <TestSessionPage testId={currentParams?.testId} onNavigate={handleNavigate} user={user} profile={profile} />;
      case 'review':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('review')} />;
        return <ReviewPage user={user} onNavigate={handleNavigate} params={currentParams} />;
      case 'premium-class':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('premium-class')} />;
        return <ClassDashboardPage user={user} profile={profile} onNavigate={handleNavigate} />;
      case 'teacher':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('teacher')} />;
        const isTeacher = profile?.is_teacher === true || adminUnlocked;
        if (!isTeacher) return <DashboardPage user={user} profile={profile} onNavigate={handleNavigate} />;
        return <TeacherPage user={user} profile={profile} onNavigate={handleNavigate} />;
      case 'teacher-signup':
        return <TeacherSignupPage onNavigate={handleNavigate} />;
      case 'admin':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('admin')} />;
        return adminUnlocked ? <AdminPage onNavigate={handleNavigate} /> : <HomePage onNavigate={handleNavigate} />;
      case 'admin-olympiad':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('admin-olympiad')} />;
        return adminUnlocked ? <OlympiadAdminPage /> : <HomePage onNavigate={handleNavigate} />;
      case 'admin-import':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('admin-import')} />;
        return adminUnlocked ? <ImportDashboard onNavigate={handleNavigate} /> : <HomePage onNavigate={handleNavigate} />;
      case 'admin-import-new':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('admin-import-new')} />;
        return adminUnlocked ? <NewImport onNavigate={handleNavigate} /> : <HomePage onNavigate={handleNavigate} />;
      case 'admin-import-review':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('admin-import-review')} />;
        return adminUnlocked ? <ImportReview onNavigate={handleNavigate} jobId={currentParams?.jobId} /> : <HomePage onNavigate={handleNavigate} />;
      case 'admin-formatting-review':
        if (!user) return <AuthPage onSuccess={() => setCurrentPage('admin-formatting-review')} />;
        return adminUnlocked ? <FormattingReview onNavigate={handleNavigate} /> : <HomePage onNavigate={handleNavigate} />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  const fullyReady = authReady && (user === null || isProfileComplete !== null);

  if (!fullyReady) {
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
            profile={profile}
            onLogout={handleLogout}
            isVisible={isSidebarVisible}
            isCollapsed={isSidebarCollapsed}
            onToggleVisibility={() => setIsSidebarVisible(!isSidebarVisible)}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isAdmin={adminUnlocked}
          />
          <main
            className={`flex-1 transition-all duration-300 relative z-10 flex flex-col ${!isSidebarVisible ? 'ml-0' : (isSidebarCollapsed ? 'ml-20' : 'ml-64')
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
            <div className="flex-1">
              {renderPage()}
            </div>
            {currentPage === 'home' && <ResultsMarquee />}
            {!isTestSession && <Footer onNavigate={handleNavigate} />}
          </main>
        </div>
      ) : (
        <main className="relative z-10">
          {renderPage()}
          {currentPage === 'home' && <ResultsMarquee />}
          {!isTestSession && <Footer onNavigate={handleNavigate} />}
        </main>
      )}

      <Toaster />
    </div>
  );
}
