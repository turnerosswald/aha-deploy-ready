services:
  - type: web
    name: aha-learning-preview
    runtime: node
    plan: free
    buildCommand: npm install --include=dev && npm run check && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: OPENAI_MODEL
        value: gpt-6-luna
      - key: AI_REQUESTS_PER_HOUR
        value: '12'
      # Set these two together in Render's Environment panel to enable
      # private AI testing. Do NOT paste keys in this file or into GitHub.
      # OPENAI_API_KEY=... (secret)
      # SITE_ACCESS_PASSWORD=... (12+ chars; protects every user-facing route)
      # AI_SIGNING_SECRET=... (optional strong stable signing key)
