// Storage each plan includes (shared by the app and the server's upload check)
export const STORAGE_LIMITS: Record<string, number> = {
  free: 1_073_741_824,       // 1GB
  pro: 26_843_545_600,       // 25GB
  agency: 268_435_456_000,   // 250GB
}
export const storageLimitFor = (plan?: string | null) => STORAGE_LIMITS[plan || ''] ?? STORAGE_LIMITS.free
