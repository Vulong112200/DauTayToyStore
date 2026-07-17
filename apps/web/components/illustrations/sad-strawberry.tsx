/**
 * Cute "Dâu Tây" (strawberry) mascot with a worried little face — used on the
 * friendly 404 / error fallback pages so a broken URL greets the visitor with the
 * brand character instead of a cold error code on a blank screen. Self-contained
 * SVG (no external asset), fixed cheerful colors that read well in light & dark.
 */
export function SadStrawberry({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role="img"
      aria-label="Bạn dâu tây đang bối rối"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="berry-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF7BA9" />
          <stop offset="100%" stopColor="#E63E77" />
        </linearGradient>
        <linearGradient id="berry-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6FD07C" />
          <stop offset="100%" stopColor="#3DA65A" />
        </linearGradient>
      </defs>

      {/* soft shadow */}
      <ellipse cx="120" cy="222" rx="62" ry="12" fill="#000000" opacity="0.08" />

      {/* strawberry body */}
      <path
        d="M120 72
           C 168 72, 196 104, 188 146
           C 182 182, 152 214, 120 218
           C 88 214, 58 182, 52 146
           C 44 104, 72 72, 120 72 Z"
        fill="url(#berry-body)"
      />

      {/* seeds */}
      {[
        [92, 118],
        [148, 118],
        [78, 150],
        [120, 148],
        [162, 150],
        [100, 182],
        [140, 182],
      ].map(([x, y], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="4"
          ry="7"
          fill="#FFE08A"
          transform={`rotate(${(i % 2 === 0 ? -12 : 12)} ${x} ${y})`}
        />
      ))}

      {/* leafy crown */}
      <g fill="url(#berry-leaf)">
        <path d="M120 40 C 108 58, 92 66, 74 66 C 92 78, 110 74, 120 62 C 130 74, 148 78, 166 66 C 148 66, 132 58, 120 40 Z" />
        <path d="M120 44 C 116 62, 104 74, 90 80 C 110 82, 122 72, 120 58 C 118 72, 130 82, 150 80 C 136 74, 124 62, 120 44 Z" />
      </g>
      {/* little stem */}
      <rect x="115" y="30" width="10" height="18" rx="5" fill="#3DA65A" />

      {/* cheeks */}
      <circle cx="86" cy="158" r="11" fill="#FF9EC4" opacity="0.7" />
      <circle cx="154" cy="158" r="11" fill="#FF9EC4" opacity="0.7" />

      {/* eyes */}
      <circle cx="98" cy="140" r="12" fill="#FFFFFF" />
      <circle cx="142" cy="140" r="12" fill="#FFFFFF" />
      <circle cx="99" cy="142" r="6" fill="#2B2B3A" />
      <circle cx="143" cy="142" r="6" fill="#2B2B3A" />
      <circle cx="101" cy="140" r="2" fill="#FFFFFF" />
      <circle cx="145" cy="140" r="2" fill="#FFFFFF" />

      {/* worried little mouth */}
      <path
        d="M112 168 Q 120 160, 128 168"
        fill="none"
        stroke="#2B2B3A"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
