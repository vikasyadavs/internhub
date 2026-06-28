import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import OnboardingScreen from '../OnboardingScreen';
import { useAuth } from '../../contexts/AuthContext';

export default function AppShell() {
  const { user, updateUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (user) {
      // Show onboarding if first_login flag is set
      const needsOnboarding = user.first_login === true;
      setShowOnboarding(needsOnboarding);
      setOnboardingChecked(true);
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Clear first_login in auth context and localStorage
    if (updateUser) updateUser({ first_login: false });
  };

  // Show onboarding overlay if needed
  if (onboardingChecked && showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-navy">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 z-30 bg-navy">
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto w-full animate-fade-in">
          <Outlet />
        </main>
        {/* Footer */}
        <footer className="app-footer lg:ml-0 px-6">
          InternHub &nbsp;|&nbsp; SI Placements Internationals × Site4People &nbsp;|&nbsp; Ahmedabad
        </footer>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
}
