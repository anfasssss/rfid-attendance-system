import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brahmagupta.campus',
  appName: 'ID Card App',
  webDir: '.output/public',
  server: {
    androidScheme: 'http',
    iosScheme: 'http',
    hostname: 'localhost'
  }
};

export default config;
