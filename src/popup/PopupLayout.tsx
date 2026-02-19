import React from 'react';
import { useLocation, useOutlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Settings, HeartHandshake, History } from 'lucide-react';
import Dock from '@/components/ui/dock';
import { Toaster } from '@/components/ui/toaster';
import { BackgroundMesh } from '@/components/ui/background-mesh';
import { useSidePanelMode } from '@/hooks/use-side-panel-mode';
import { cn } from '@/lib/utils';
import { NO_ANIMATION_ROUTES } from '@/lib/const';

export const PopupLayout: React.FC = () => {
  const { isPopup } = useSidePanelMode();
  const location = useLocation();
  const element = useOutlet();
  const navigate = useNavigate();

  const isAnimated = !NO_ANIMATION_ROUTES.includes(location.pathname);

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      onClick: () => navigate('/dashboard'),
    },
    {
      icon: HeartHandshake,
      label: 'Staking',
      onClick: () => navigate('/staking'),
    },
    {
      icon: History,
      label: 'History',
      onClick: () => navigate('/transactions'),
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
  ];

  const activeLabel = navItems.find((item) => {
    if (item.label === 'Home') return location.pathname === '/dashboard';
    if (item.label === 'Staking') return location.pathname === '/staking';
    if (item.label === 'History') return location.pathname === '/transactions';
    if (item.label === 'Settings') {
      return location.pathname.startsWith('/settings');
    }
    return false;
  })?.label;

  return (
    <div
      className={cn(
        'h-full min-h-screen bg-background text-foreground flex flex-col mx-auto transition-all duration-300 ease-in-out',
        isPopup ? 'w-full max-w-[550px] shadow-2xl my-auto' : 'w-full',
      )}
    >
      <BackgroundMesh />

      <main
        className={cn(
          'flex-1 overflow-auto relative px-4',
          activeLabel ? 'pb-24' : 'pb-0',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={isAnimated ? { opacity: 0, y: 5 } : { opacity: 1, y: 0 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: isAnimated ? 0.2 : 0,
                ease: 'easeInOut',
                delay: isAnimated ? 0.1 : 0,
              },
            }}
            exit={isAnimated ? { opacity: 0, y: 5 } : { opacity: 0, y: 0 }}
            transition={{ duration: isAnimated ? 0.2 : 0, ease: 'easeInOut' }}
            className="min-h-full flex flex-col w-full max-w-3xl mx-auto"
          >
            {element}
          </motion.div>
        </AnimatePresence>
      </main>

      {activeLabel && (
        <div
          className={cn(
            'fixed bottom-4 z-50 transition-all duration-300',
            isPopup
              ? 'left-1/2 -translate-x-1/2 w-full max-w-[350px] px-4'
              : 'left-0 right-0 px-4',
          )}
        >
          <Dock items={navItems} activeLabel={activeLabel} className="py-2" />
        </div>
      )}

      <Toaster />
    </div>
  );
};
