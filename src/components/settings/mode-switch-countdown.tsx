import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ModeSwitchCountdownProps {
  seconds: number;
  targetMode: string;
  onComplete: () => void;
}

export const ModeSwitchCountdown: React.FC<ModeSwitchCountdownProps> = ({
  seconds,
  targetMode,
  onComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const { t } = useTranslation();

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  const modeLabel =
    targetMode === 'sidepanel'
      ? t('settings.display_mode_sheet.sidepanel')
      : t('settings.display_mode_sheet.popup');

  return (
    <span>
      {t('settings.display_mode_sheet.countdown', {
        mode: modeLabel,
        seconds: timeLeft,
      })}
    </span>
  );
};
