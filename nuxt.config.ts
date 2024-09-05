import Aura from '@primevue/themes/aura';
import {defineNuxtConfig} from 'nuxt/config';

export default ({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },  
  runtimeConfig: {
    public: {
      apiBaseUrl: 'http://10.0.0.74:8000', // Your FastAPI backend URL
    }
  },
  modules: [
    '@primevue/nuxt-module'
  ],
  primevue: {
    // usePrimeVue: true,
    // autoImport: true,
    options: {
      // unstyled: true
        theme: {
            preset: Aura,
            options: {
              darkModeSelector: 'system'
            }
        }
    }
  },
  server: {
    host: '0.0.0.0',  // Bind Nuxt to all available network interfaces
    port: 3000         // Port for Nuxt app, change if needed
  }

})
