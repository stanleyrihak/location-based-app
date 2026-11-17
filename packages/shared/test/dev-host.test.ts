import assert from 'node:assert/strict';
import { test } from 'node:test';

import { devServerHost } from '../src/dev-host.ts';

test('the host comes from hostUri when Expo knows it', () => {
  assert.equal(devServerHost('192.168.1.20:8081', undefined), '192.168.1.20');
});

test('without hostUri, the host comes from where the code was loaded (Metro)', () => {
  assert.equal(
    devServerHost(undefined, 'http://10.10.12.71:8081/index.bundle?platform=ios&dev=true'),
    '10.10.12.71',
  );
});

test('a release build loads its code from a file: no host', () => {
  assert.equal(devServerHost(undefined, 'file:///var/containers/Bundle/main.jsbundle'), null);
  assert.equal(devServerHost(undefined, undefined), null);
});
