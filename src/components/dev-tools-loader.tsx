import React, { useState, useEffect, Suspense } from 'react';

// Use glob import to find the module if it exists.
// This prevents build errors if the folder is missing (gitignored).
const modules = import.meta.glob('../dev-tools/index.tsx');

const DevToolsLoader: React.FC = () => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // Only load in DEV mode
    if (import.meta.env.DEV) {
      const load = async () => {
        // There should be at most one match
        for (const path in modules) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mod = await modules[path]() as { default: React.ComponentType };
            if (mod.default) {
              setComponent(() => mod.default);
              return;
            }
          } catch (e) {
            console.error('Failed to load DevTools:', e);
          }
        }
      };
      load();
    }
  }, []);

  if (!Component) return null;

  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
};

export default DevToolsLoader;
