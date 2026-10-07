import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The link preview picture reads its fonts from disk; make sure they ship
  outputFileTracingIncludes: {
    '/\\[username\\]/\\[slug\\]/opengraph-image*': ['./assets/fonts/**/*'],
  },
  // Basic browser protections on every page. frame-ancestors keeps other
  // sites from loading the app in a hidden frame and tricking a signed-in
  // user into clicking (the PDF preview frames this site itself, which is fine).
  async headers() {
    return [{
      // The file route sends its own policy (it sandboxes SVGs), which this
      // one would replace, so it's left out here
      source: '/((?!api/file/).*)',
      headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }],
    }, {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
};

export default nextConfig;
