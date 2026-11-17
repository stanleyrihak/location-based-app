import type { MenuItem } from '@shoot/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type MenuItemChanges, updateMenuItem } from '@/data/api';
import { MENU_KEY } from '@/data/queries';

function replaceItem(items: MenuItem[] | undefined, item: MenuItem) {
  return items?.map((candidate) => (candidate.id === item.id ? item : candidate));
}

/**
 * Changes one menu item. The list changes at once (the switch moves under the finger).
 * Changes to one item go to the server one after another (`scope`), in the order tapped, so
 * the server ends up with the last tap. Only when none are left does the list take the
 * server's answer (a refetch): an earlier answer arriving mid-way must not flip the switch back.
 */
export function useUpdateMenuItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: MenuItemChanges) => updateMenuItem(id, changes),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: MENU_KEY });
      const before = queryClient.getQueryData<MenuItem[]>(MENU_KEY);
      const item = before?.find((candidate) => candidate.id === id);
      if (item) {
        queryClient.setQueryData<MenuItem[]>(
          MENU_KEY,
          replaceItem(before, { ...item, ...changes }),
        );
      }
      return { item };
    },
    onError: (_error, _changes, context) => {
      if (context?.item) {
        const item = context.item;
        queryClient.setQueryData<MenuItem[]>(MENU_KEY, (items) => replaceItem(items, item));
      }
    },
    onSuccess: (item) => {
      queryClient.setQueryData<MenuItem[]>(MENU_KEY, (items) => replaceItem(items, item));
    },
  });
}
