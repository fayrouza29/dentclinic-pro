import { CABINET } from "@/lib/cabinet"

export function Logo({ size = 40, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <defs>
          <linearGradient id="dentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <path
          d="M20 15 C20 15, 15 10, 25 8 C32 6, 38 12, 50 12
          C62 12, 68 6, 75 8 C85 10, 80 15, 80 15
          C85 25, 82 35, 78 45 C74 55, 72 60, 68 70
          C65 78, 62 88, 58 92 C55 96, 52 96, 50 92
          C48 96, 45 96, 42 92 C38 88, 35 78, 32 70
          C28 60, 26 55, 22 45 C18 35, 15 25, 20 15 Z"
          fill="url(#dentGrad)"
        />
        <path
          d="M30 20 C30 20, 28 15, 35 13 C40 11, 45 16, 50 16"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path d="M44 42 L44 58 M37 50 L57 50" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      </svg>

      {showText ? (
        <div>
          <p className="leading-tight font-bold text-lg text-gray-800 dark:text-white">
            DentClinic
            <span className="text-blue-500"> Pro</span>
          </p>
          <p className="text-xs leading-tight text-gray-500 dark:text-gray-400">{CABINET.nomCourt}</p>
        </div>
      ) : null}
    </div>
  )
}
