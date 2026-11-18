import { Linking } from 'react-native';

import { Button } from './button';

type Props = {
  /** As the server sends it, spaces allowed ("+358 40 123 4501"). Empty: no button. */
  phone: string;
  /** "Call Casablanca", "Call the customer". */
  label: string;
};

/**
 * Opens the phone's dialler with the number filled in. The person still taps Call there, so
 * nothing is dialled by accident. This replaces chat (4.3) for the demo.
 */
export function CallButton({ phone, label }: Props) {
  if (phone === '') return null;
  return (
    <Button
      variant="secondary"
      icon="phone"
      onPress={() => void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}
    >
      {label}
    </Button>
  );
}
