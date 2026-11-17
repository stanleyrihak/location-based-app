// The app's entry. The background location task must be defined before Expo Router loads
// anything: when Android restarts the app just to deliver positions, no screen (and so no
// layout file) is loaded, but this file always runs.
import './src/location/share-position';
import 'expo-router/entry';
