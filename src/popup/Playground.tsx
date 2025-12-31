import React, { useState } from 'react';

import { useEffect } from 'react';
import { ModeSelector } from '@/components/ui/mode-selector';

const PlaygroundPage: React.FC = () => {
  const [uiMode, setUiMode] = useState<'popup' | 'sidepanel'>('sidepanel');

  useEffect(() => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get({ uiMode: 'sidepanel' }, (res) => {
        setUiMode(res.uiMode as 'popup' | 'sidepanel');
      });
    }
  }, []);

  function updateMode(next: 'popup' | 'sidepanel') {
    setUiMode(next);
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SET_UIMODE', value: next });
    }
  }

  return (
    <div
      style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}
      className="space-y-8 pb-20"
    >
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Welcome to your secure crypto wallet.
        </p>
        <ModeSelector mode={uiMode} onChange={updateMode} />
      </div>
    </div>
  );
};

export default PlaygroundPage;
