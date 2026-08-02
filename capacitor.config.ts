import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aibhabhiji.sportstracker',
  appName: 'sports-tracker',
  webDir: 'public', // or '.next' if using static export, but live URL overrides webDir execution
  server: {
    url: 'https://sports-tracker-pied.vercel.app/',
    cleartext: true // optional, allows http for local testing if needed
  }
};

export default config;