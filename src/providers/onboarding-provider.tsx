import { createContext, type PropsWithChildren, use, useState } from 'react';
import 'expo-sqlite/localStorage/install';

const STORAGE_KEY = 'hasOnboarded';

const OnboardingContext = createContext<{
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  hasOnboarded: boolean;
} | null>(null);

export function useOnboarding() {
  const value = use(OnboardingContext);
  if (!value) {
    throw new Error('useOnboarding must be wrapped in a <OnboardingProvider />');
  }

  return value;
}

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [hasOnboarded, setHasOnboarded] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true',
  );

  return (
    <OnboardingContext.Provider
      value={{
        completeOnboarding: () => {
          localStorage.setItem(STORAGE_KEY, 'true');
          setHasOnboarded(true);
        },
        resetOnboarding: () => {
          localStorage.removeItem(STORAGE_KEY);
          setHasOnboarded(false);
        },
        hasOnboarded,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
