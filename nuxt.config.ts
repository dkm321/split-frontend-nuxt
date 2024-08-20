import Aura from '@primevue/themes/aura';
import {defineNuxtConfig} from 'nuxt/config';

export default ({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },  
  runtimeConfig: {
    public: {
      apiBaseUrl: 'http://localhost:8000', // Your FastAPI backend URL
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
}
})
