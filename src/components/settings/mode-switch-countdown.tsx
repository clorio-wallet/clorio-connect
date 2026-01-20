import React, { useEffect, useState } from 'react';

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

  return (
    <span>
      Switching to {targetMode === 'sidepanel' ? 'Side Panel' : 'Popup'} in {timeLeft} seconds...
    </span>
  );
};
