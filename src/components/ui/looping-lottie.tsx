import React, { useRef } from 'react';
import Lottie, {
  LottieComponentProps,
  LottieRefCurrentProps,
} from 'lottie-react';

interface LoopingLottieProps extends Omit<LottieComponentProps, 'lottieRef'> {
  loopLastSeconds?: number;
  loopDelay?: number; // Delay in ms between loops
}

export const LoopingLottie: React.FC<LoopingLottieProps> = ({
  loopLastSeconds,
  loopDelay = 0,
  animationData,
  onComplete,
  loop,
  ...props
}) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const isCustomLoop =
    (loopLastSeconds && loopLastSeconds > 0) || (loopDelay && loopDelay > 0);
  
  // If we have custom loop logic, we disable the native loop so onComplete fires.
  const shouldLoop = isCustomLoop ? false : loop;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleComplete = (e?: any) => {
    // If we have custom loop logic (either partial loop or delay)
    if (isCustomLoop) {
      if (loopDelay > 0) {
        // Pause and wait for delay
        setTimeout(() => {
          triggerLoop();
        }, loopDelay);
      } else {
        // Immediate loop
        triggerLoop();
      }
    }

    // Call original onComplete if provided
    if (onComplete) {
      onComplete(e);
    }
  };

  const triggerLoop = () => {
    if (!lottieRef.current || !animationData) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const animData = animationData as any;
    const fr = animData.fr || 60;
    const op = animData.op || 100;

    let startFrame = 0;

    if (loopLastSeconds && loopLastSeconds > 0) {
      startFrame = Math.max(0, op - loopLastSeconds * fr);
    }

    // Play the segment. If force=true, it jumps immediately.
    lottieRef.current.playSegments([startFrame, op], true);
  };

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={shouldLoop}
      onComplete={handleComplete}
      {...props}
    />
  );
};
