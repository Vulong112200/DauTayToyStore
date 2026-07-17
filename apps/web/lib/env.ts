// Strip any trailing slash so a value like "https://api.example.com/api/" can't
// produce double-slash request URLs ("//admin/...") — some proxies/CDNs answer
// those with a 404. `${apiUrl}${path}` (path always starts with "/") then joins cleanly.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const env = {
  apiUrl: rawApiUrl.replace(/\/+$/, ''),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
};

// Loud diagnostic for the most common deploy misconfiguration: `NEXT_PUBLIC_API_URL`
// (a build-time var) not set on Vercel, so the deployed bundle silently falls back to
// localhost and EVERY API call from the live site fails — which shows up as a wall of
// 404/failed requests across the admin dashboard. Surface it in the browser console
// instead of letting it fail silently. Runs client-side only; no effect in local dev.
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (!isLocalHost && env.apiUrl.includes('localhost')) {
    console.error(
      `[DauTayToy] NEXT_PUBLIC_API_URL chưa được cấu hình cho môi trường deploy — đang trỏ về "${env.apiUrl}". ` +
        `Mọi lời gọi API (kể cả dashboard admin) sẽ thất bại/404. ` +
        `Hãy đặt NEXT_PUBLIC_API_URL = URL public của API (ví dụ https://your-api.onrender.com/api, ` +
        `bắt buộc kết thúc bằng /api) trên Vercel rồi Redeploy.`,
    );
  }
}
