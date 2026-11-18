import { useQueryClient } from '@tanstack/react-query';
import { createContext, type PropsWithChildren, use, useEffect, useState } from 'react';
import 'expo-sqlite/localStorage/install';

import { getToken, onSessionEnd } from '@/data/session';

const STORAGE_KEY = 'hasOnboarded';

const OnboardingContext = createContext<{
  completeOnboarding: () => void;
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
  const queryClient = useQueryClient();
  // Done means both: finished the welcome steps, and signed in (a token is saved).
  // Someone from before the server existed has the flag but no token, so they sign in again.
  const [hasOnboarded, setHasOnboarded] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true' && getToken() !== null,
  );

  useEffect(
    // When the session ends (sign-out, or the server answers 401), go back to the welcome
    // screen and forget the cached data: the next person must not see these orders.
    () =>
      onSessionEnd(() => {
        localStorage.removeItem(STORAGE_KEY);
        setHasOnboarded(false);
        queryClient.clear();
      }),
    [queryClient],
  );

  return (
    <OnboardingContext.Provider
      value={{
        completeOnboarding: () => {
          localStorage.setItem(STORAGE_KEY, 'true');
          setHasOnboarded(true);
        },
        hasOnboarded,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
