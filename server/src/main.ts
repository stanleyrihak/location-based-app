import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';

import { config } from './config.ts';
import { handle } from './http.ts';
import { startAutoAdvance } from './status.ts';

// Importing a routes file registers its routes.
import './routes/auth.ts';
import './routes/cafes.ts';
import './routes/files.ts';
import './routes/orders.ts';
import './routes/staff.ts';

if (config.devRoutes) {
  await import('./routes/dev.ts');
}

startAutoAdvance();

/** The Mac's addresses on the Wi-Fi, which a phone on the same network can reach. */
function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net?.address);
}

// 0.0.0.0: listen on every network, not only this computer, so your phone can connect.
createServer(handle).listen(config.port, '0.0.0.0', () => {
  console.log(`Shoot server on http://localhost:${config.port}`);
  for (const address of lanAddresses()) {
    console.log(`  from your phone: http://${address}:${config.port}`);
  }
  console.log(`  SMS code: ${config.fixedSmsCode || 'random, printed when sent'}`);
  console.log(`  auto-advance orders: ${config.autoAdvance ? 'on' : 'off'}`);
});
