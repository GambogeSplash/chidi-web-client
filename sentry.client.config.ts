import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of sessions as replays in production; 100% on errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Trace 10% of requests for performance monitoring
  tracesSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Show dialog asking users to describe what happened when an error occurs
  beforeSend(event) {
    return event
  },
})
