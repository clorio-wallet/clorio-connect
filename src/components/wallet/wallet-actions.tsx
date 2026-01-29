import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Send, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, Variants } from 'framer-motion';

interface WalletActionsProps {
  onReceiveClick: () => void;
  disabled?: boolean;
}

export const WalletActions: React.FC<WalletActionsProps> = ({
  onReceiveClick,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut"
      }
    })
  };

  const buttonVariants: Variants = {
    hover: { 
      scale: 1.1,
      boxShadow: "0px 10px 20px rgba(0,0,0,0.1)",
      transition: { type: "spring", stiffness: 400, damping: 10 }
    },
    tap: { 
      scale: 0.9,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }
  };

  return (
    <div className="flex justify-center gap-12 py-2">
      <motion.div 
        className="flex flex-col items-center gap-2"
        custom={0}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-none bg-white text-black hover:bg-white/90 shadow-md"
            onClick={() => navigate('/send')}
            disabled={disabled}
          >
            <Send className="h-6 w-6 ml-0.5 mt-0.5" fill="currentColor" />
          </Button>
        </motion.div>
        <span className="text-sm font-medium text-white/90">{t('dashboard.send')}</span>
      </motion.div>

      <motion.div 
        className="flex flex-col items-center gap-2"
        custom={1}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-none bg-white text-black hover:bg-white/90 shadow-md"
            onClick={onReceiveClick}
            disabled={disabled}
          >
            <QrCode className="h-6 w-6" strokeWidth={2.5} />
          </Button>
        </motion.div>
        <span className="text-sm font-medium text-white/90">{t('dashboard.receive')}</span>
      </motion.div>
    </div>
  );
};
