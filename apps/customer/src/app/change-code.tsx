import { SmsCodeForm } from '@/components/sms-code-form';

/** Profile → Change: 1.3 again, proving the new number. Back to Profile when it's saved. */
export default function ChangeCodeScreen() {
  return <SmsCodeForm mode="change" />;
}
