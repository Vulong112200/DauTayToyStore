'use client';

import * as React from 'react';

/**
 * Last-resort fallback for an error thrown in the ROOT layout itself. Next.js
 * renders this *instead of* the root layout, so globals.css / Tailwind / the
 * app fonts are NOT loaded here — everything must be inline-styled and
 * self-contained (hence the 🍓 emoji instead of the SVG mascot component).
 * Still friendly, never the raw black error screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ margin: 0 }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem 1.5rem',
            fontFamily:
              "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            background: 'linear-gradient(135deg, #FFD6E5 0%, #FFF7F0 50%, #CDEBFF 100%)',
            color: '#26263a',
          }}
        >
          <div style={{ fontSize: '96px', lineHeight: 1 }} aria-hidden="true">
            🍓
          </div>
          <h1 style={{ margin: '1.25rem 0 0', fontSize: '1.9rem', fontWeight: 800 }}>
            Ối! Có gì đó không ổn
          </h1>
          <p style={{ margin: '0.75rem 0 0', maxWidth: '28rem', color: '#5b5b6b', fontSize: '1rem' }}>
            Trang gặp một sự cố ngoài ý muốn. Bạn thử tải lại nhé — nếu vẫn chưa được, hãy quay về
            trang chủ giúp mình.
          </p>
          <div
            style={{
              marginTop: '2rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: 'pointer',
                border: 'none',
                borderRadius: '1rem',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ffffff',
                background: '#E63E77',
              }}
            >
              Thử lại
            </button>
            <a
              href="/"
              style={{
                textDecoration: 'none',
                borderRadius: '1rem',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#26263a',
                background: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              Về trang chủ
            </a>
          </div>
          {error.digest && (
            <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#8a8a99' }}>
              Mã tham chiếu lỗi: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
