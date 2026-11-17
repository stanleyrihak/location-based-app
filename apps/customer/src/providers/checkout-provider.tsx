import { createContext, type PropsWithChildren, use, useState } from 'react';

import type { Spot } from '@/data/types';
import { PAYMENT_METHODS, type PaymentMethod } from '@/payments/payment-methods';

/**
 * The two photos that prove where you are. Each is a file URI from the camera
 * (in the app's cache folder), or a bundled image (a number) for the dev sample.
 */
export type SpotPhotos = {
  selfie: string | number;
  spot: string | number;
};

type CheckoutContextValue = {
  /** Set when the user scanned a spot code (2.6). */
  spot: Spot | null;
  setSpot: (spot: Spot | null) => void;
  /** Set when the user took the two photos (2.4, 2.4b). */
  photos: SpotPhotos | null;
  setPhotos: (photos: SpotPhotos | null) => void;
  /** Chosen on 2.7, shown again on the payment sheet (2.8). The wallet is the default. */
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function useCheckout() {
  const value = use(CheckoutContext);
  if (!value) {
    throw new Error('useCheckout must be used inside the checkout stack');
  }
  return value;
}

/**
 * What the user has chosen during one checkout: a scanned spot, or the two photos.
 * The order needs one of them. They exclude each other: choosing one clears the other,
 * so the café never gets a photo from one attempt and a code from another.
 *
 * Unlike the cart, this lives in `checkout/_layout.tsx`, not the root layout. When the user
 * leaves checkout (back to the menu, or after paying), the layout unmounts and this state is
 * gone with it, so the next checkout starts fresh without anyone having to clear it.
 */
export function CheckoutProvider({ children }: PropsWithChildren) {
  const [spot, setSpotState] = useState<Spot | null>(null);
  const [photos, setPhotosState] = useState<SpotPhotos | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);

  return (
    <CheckoutContext.Provider
      value={{
        spot,
        setSpot: (next) => {
          setSpotState(next);
          if (next) setPhotosState(null);
        },
        photos,
        setPhotos: (next) => {
          setPhotosState(next);
          if (next) setSpotState(null);
        },
        paymentMethod,
        setPaymentMethod,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}
