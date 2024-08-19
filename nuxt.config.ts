// nuxt.config.ts
export default ({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBaseUrl: 'http://localhost:8000', // Your FastAPI backend URL
    }
  }
})
