// The address portals actually live at (e.g. app.voxabase.com), for display.
export const APP_HOST = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.voxabase.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '')
