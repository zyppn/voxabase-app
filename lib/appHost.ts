// The address portals actually live at (e.g. app.voxabase.com), for display.
export const APP_HOST = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.voxabase.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '')

// The same address with its scheme, for absolute links (link preview pictures)
export const APP_ORIGIN = (/^https?:\/\//.test(process.env.NEXT_PUBLIC_APP_URL || '')
  ? process.env.NEXT_PUBLIC_APP_URL!
  : `https://${APP_HOST}`).replace(/\/+$/, '')
