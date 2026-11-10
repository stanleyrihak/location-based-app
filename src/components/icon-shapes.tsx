import { type ReactElement } from 'react';
import { Circle, Path, Rect } from 'react-native-svg';

export type IconName = keyof typeof IconShapes;

export const IconShapes = {
  back: <Path d="m15 18-6-6 6-6" />,
  'chev-r': <Path d="m9 18 6-6-6-6" />,
  'chev-d': <Path d="m6 9 6 6 6-6" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="8" />
      <Path d="m21 21-4.3-4.3" />
    </>
  ),
  pin: (
    <>
      <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <Circle cx="12" cy="10" r="3" />
    </>
  ),
  'pin-alert': (
    <>
      <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <Path d="M12 7v3.5" />
      <Path d="M12 14h.01" />
    </>
  ),
  'qr-x': (
    <>
      <Rect width="5" height="5" x="3" y="3" rx="1" />
      <Rect width="5" height="5" x="16" y="3" rx="1" />
      <Rect width="5" height="5" x="3" y="16" rx="1" />
      <Path d="m15 15 6 6" />
      <Path d="m21 15-6 6" />
    </>
  ),
  'pin-off': (
    <>
      <Path d="M12.75 7.09a3 3 0 0 1 2.16 2.16" />
      <Path d="M17.072 17.072c-1.634 2.17-3.527 3.912-4.471 4.727a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 1.432-4.568" />
      <Path d="m2 2 20 20" />
      <Path d="M8.475 2.818A8 8 0 0 1 20 10c0 1.183-.31 2.377-.81 3.533" />
      <Path d="M9.13 9.13a3 3 0 0 0 3.74 3.74" />
    </>
  ),
  camera: (
    <>
      <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <Circle cx="12" cy="13" r="3" />
    </>
  ),
  qr: (
    <>
      <Rect width="5" height="5" x="3" y="3" rx="1" />
      <Rect width="5" height="5" x="16" y="3" rx="1" />
      <Rect width="5" height="5" x="3" y="16" rx="1" />
      <Path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <Path d="M21 21v.01" />
      <Path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <Path d="M3 12h.01" />
      <Path d="M12 3h.01" />
      <Path d="M12 16v.01" />
      <Path d="M16 12h1" />
      <Path d="M21 12v.01" />
      <Path d="M12 21v-1" />
    </>
  ),
  check: <Path d="M20 6 9 17l-5-5" />,
  plus: (
    <>
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </>
  ),
  minus: <Path d="M5 12h14" />,
  x: (
    <>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </>
  ),
  alert: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 8v4" />
      <Path d="M12 16h.01" />
    </>
  ),
  home: (
    <>
      <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <Path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  receipt: (
    <>
      <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <Path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <Path d="M12 17.5v-11" />
    </>
  ),
  user: (
    <>
      <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </>
  ),
  shield: (
    <>
      <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <Path d="m9 12 2 2 4-4" />
    </>
  ),
  arrow: (
    <>
      <Path d="M5 12h14" />
      <Path d="m12 5 7 7-7 7" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 6v6l4 2" />
    </>
  ),
  message: <Path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  signal: (
    <>
      <Path d="M2 20h.01" />
      <Path d="M7 20v-4" />
      <Path d="M12 20v-8" />
      <Path d="M17 20V8" />
      <Path d="M22 4v16" />
    </>
  ),
  wifi: (
    <>
      <Path d="M12 20h.01" />
      <Path d="M2 8.82a15 15 0 0 1 20 0" />
      <Path d="M5 12.859a10 10 0 0 1 14 0" />
      <Path d="M8.5 16.429a5 5 0 0 1 7 0" />
    </>
  ),
  battery: (
    <>
      <Rect width="16" height="10" x="2" y="7" rx="2" ry="2" />
      <Path d="M22 11v2" />
      <Path d="M6 11v2" />
      <Path d="M10 11v2" />
      <Path d="M14 11v2" />
    </>
  ),
  delete: (
    <>
      <Path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
      <Path d="m12 9 6 6" />
      <Path d="m18 9-6 6" />
    </>
  ),
  card: (
    <>
      <Rect width="20" height="14" x="2" y="5" rx="2" />
      <Path d="M2 10h20" />
    </>
  ),
  wallet: (
    <>
      <Path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <Path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
  'face-id': (
    <>
      <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <Path d="M9 9h.01" />
      <Path d="M15 9h.01" />
    </>
  ),
  help: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <Path d="M12 17h.01" />
    </>
  ),
  users: (
    <>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  share: (
    <>
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Path d="m8.59 13.51 6.83 3.98" />
      <Path d="m15.41 6.51-6.82 3.98" />
    </>
  ),
  again: (
    <>
      <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <Path d="M3 3v5h5" />
    </>
  ),
  walk: <Path d="M3 11 22 2l-9 19-2-8z" />,
  store: (
    <>
      <Path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <Path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <Path d="M2 7h20" />
      <Path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
    </>
  ),
  cup: (
    <>
      <Path d="M10 2v2" />
      <Path d="M14 2v2" />
      <Path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
      <Path d="M6 2v2" />
    </>
  ),
} as const satisfies Record<string, ReactElement>;
