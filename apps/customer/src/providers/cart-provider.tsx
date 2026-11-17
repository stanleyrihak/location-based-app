import type { MenuItem } from '@shoot/shared';
import { createContext, type PropsWithChildren, use, useReducer } from 'react';

/**
 * A line keeps its own copy of the item. The cart screen then doesn't need the menu
 * loaded, and the price you saw when adding is the price you pay.
 */
export type CartLine = { item: MenuItem; quantity: number };

type CartState = {
  /** null while the cart is empty. A cart only ever holds one café's items. */
  cafeId: string | null;
  lines: CartLine[];
  /** "Note for the café" on 2.2. */
  note: string;
};

type CartAction =
  | { type: 'add'; item: MenuItem }
  | { type: 'remove'; itemId: string }
  | { type: 'removeItems'; itemIds: string[] }
  | { type: 'setNote'; note: string }
  | { type: 'replace'; cafeId: string; lines: CartLine[] }
  | { type: 'clear' };

const EMPTY: CartState = { cafeId: null, lines: [], note: '' };

/**
 * Every cart rule in one pure function: given the cart and what happened, return the new cart.
 * Screens only say what happened (`dispatch`), so the rules can't drift between screens.
 */
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const { item } = action;
      // One café per cart. The screen asks the user first; this line makes sure
      // two cafés can never end up mixed, even if a screen forgets to ask.
      const base = state.cafeId === item.cafeId ? state : { ...EMPTY, cafeId: item.cafeId };
      const exists = base.lines.some((line) => line.item.id === item.id);
      return {
        ...base,
        lines: exists
          ? base.lines.map((line) =>
              line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
            )
          : [...base.lines, { item, quantity: 1 }],
      };
    }
    case 'remove': {
      const lines = state.lines
        .map((line) =>
          line.item.id === action.itemId ? { ...line, quantity: line.quantity - 1 } : line,
        )
        .filter((line) => line.quantity > 0);
      // The last item gone means an empty cart, so it stops belonging to a café.
      return lines.length === 0 ? EMPTY : { ...state, lines };
    }
    case 'removeItems': {
      // Whole lines at once, whatever the quantity (E6: sold out). The note stays.
      const lines = state.lines.filter((line) => !action.itemIds.includes(line.item.id));
      return lines.length === 0 ? EMPTY : { ...state, lines };
    }
    case 'setNote':
      return { ...state, note: action.note };
    case 'replace':
      // "Order again": the old order becomes the whole cart, in one step.
      return action.lines.length === 0
        ? EMPTY
        : { ...EMPTY, cafeId: action.cafeId, lines: action.lines };
    case 'clear':
      return EMPTY;
  }
}

type CartContextValue = CartState & {
  itemCount: number;
  subtotalCents: number;
  quantityOf: (itemId: string) => number;
  add: (item: MenuItem) => void;
  remove: (itemId: string) => void;
  removeItems: (itemIds: string[]) => void;
  setNote: (note: string) => void;
  replace: (cafeId: string, lines: CartLine[]) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const value = use(CartContext);
  if (!value) {
    throw new Error('useCart must be wrapped in a <CartProvider />');
  }
  return value;
}

/** Holds the cart in memory: closing the app empties it. */
export function CartProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY);

  // Derived on every render instead of stored, so they can never disagree with `lines`.
  const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalCents = state.lines.reduce(
    (sum, line) => sum + line.item.priceCents * line.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        ...state,
        itemCount,
        subtotalCents,
        quantityOf: (itemId) => state.lines.find((line) => line.item.id === itemId)?.quantity ?? 0,
        add: (item) => dispatch({ type: 'add', item }),
        remove: (itemId) => dispatch({ type: 'remove', itemId }),
        removeItems: (itemIds) => dispatch({ type: 'removeItems', itemIds }),
        setNote: (note) => dispatch({ type: 'setNote', note }),
        replace: (cafeId, lines) => dispatch({ type: 'replace', cafeId, lines }),
        clear: () => dispatch({ type: 'clear' }),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
