// Usernames that would collide with app pages (voxabase.com/<username>/…).
export const RESERVED_USERNAMES = new Set([
  'api', 'auth', 'dashboard', 'docs', 'help', 'join', 'login', 'signup', 'logout', 'settings', 'pricing',
  'privacy', 'terms', 'stripe-setup', 'payment-success', 'forgot-password', 'reset-password', 'admin',
  'support', 'about', 'blog', 'app', 'www', 'static', 'public', 'voxabase',
])
export const isReservedUsername = (u: string) => RESERVED_USERNAMES.has(u.toLowerCase())
