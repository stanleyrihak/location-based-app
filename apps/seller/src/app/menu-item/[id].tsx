import { parsePriceInput } from '@shoot/shared';
import { Button, TextField, ThemedText, SheetContent } from '@shoot/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useMenu } from '@/data/queries';
import { useUpdateMenuItem } from '@/data/use-menu-item';

/** "4.20" for 420: how the price field starts. */
function priceText(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Edit one item, as a sheet over the Menu tab: its price and its description. */
export default function MenuItemSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useMenu().data?.find((candidate) => candidate.id === id);
  if (!item) return null;
  // Keyed by the item, so the fields start from its saved values.
  return (
    <ItemForm
      key={item.id}
      id={item.id}
      name={item.name}
      priceCents={item.priceCents}
      description={item.description}
    />
  );
}

function ItemForm(props: { id: string; name: string; priceCents: number; description: string }) {
  const update = useUpdateMenuItem(props.id);
  const [price, setPrice] = useState(priceText(props.priceCents));
  const [description, setDescription] = useState(props.description);
  const priceCents = parsePriceInput(price);

  return (
    <SheetContent style={{ paddingHorizontal: 20, gap: 12 }}>
      <ThemedText type="title" weight="bold" accessibilityRole="header">
        {props.name}
      </ThemedText>

      <ThemedText type="label" color="ink2">
        {'Price in euros'}
      </ThemedText>
      <TextField
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        accessibilityLabel="Price in euros"
      />
      {priceCents === null && (
        <ThemedText type="caption" color="error">
          {'Type a price like 3,50.'}
        </ThemedText>
      )}

      <ThemedText type="label" color="ink2" style={{ marginTop: 4 }}>
        {'Description'}
      </ThemedText>
      <TextField
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={200}
        accessibilityLabel="Description"
        style={{ minHeight: 88, paddingTop: 14, textAlignVertical: 'top' }}
      />

      {update.isError && (
        <ThemedText color="error" accessibilityRole="alert">
          {'It didn’t save. Check the connection and try again.'}
        </ThemedText>
      )}

      <Button
        disabled={priceCents === null}
        loading={update.isPending}
        onPress={() =>
          priceCents !== null &&
          update.mutate(
            { priceCents, description: description.trim() },
            { onSuccess: () => router.back() },
          )
        }
        style={{ marginTop: 8 }}
      >
        {'Save'}
      </Button>
      <Button variant="text" onPress={() => router.back()} disabled={update.isPending}>
        {'Cancel'}
      </Button>
    </SheetContent>
  );
}
