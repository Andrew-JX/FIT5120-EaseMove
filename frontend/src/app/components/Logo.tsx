interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-12 h-12" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Circle with Gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="50%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Main Circle Background */}
      <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" />
      
      {/* Inner Circle */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
      
      {/* Smooth Path Line (representing ease of movement) */}
      <path
        d="M 20 60 Q 35 45, 50 50 T 80 40"
        stroke="url(#pathGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Small circles along the path (representing precincts) */}
      <circle cx="20" cy="60" r="4" fill="white" opacity="0.8" />
      <circle cx="50" cy="50" r="4" fill="white" opacity="0.8" />
      <circle cx="80" cy="40" r="4" fill="white" opacity="0.8" />
      
      {/* Map Pin Icon (destination) */}
      <g transform="translate(72, 28)">
        <path
          d="M 8 0 C 3.58 0 0 3.58 0 8 C 0 12 8 20 8 20 C 8 20 16 12 16 8 C 16 3.58 12.42 0 8 0 Z"
          fill="white"
        />
        <circle cx="8" cy="8" r="3" fill="#14b8a6" />
      </g>
      
      {/* Letter "E" integrated into design */}
      <text
        x="25"
        y="38"
        fontFamily="Arial, sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill="white"
        opacity="0.9"
      >
        E
      </text>
      
      {/* Letter "M" */}
      <text
        x="45"
        y="75"
        fontFamily="Arial, sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill="white"
        opacity="0.9"
      >
        M
      </text>
    </svg>
  );
}

// Alternative compact version
export function LogoCompact({ className = "w-10 h-10" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="compactGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Rounded Square Background */}
      <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#compactGradient)" />
      
      {/* Stylized "EM" */}
      <text
        x="50"
        y="70"
        fontFamily="Arial, sans-serif"
        fontSize="48"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
      >
        EM
      </text>
      
      {/* Small location dot */}
      <circle cx="75" cy="30" r="8" fill="white" />
      <circle cx="75" cy="30" r="4" fill="#0891b2" />
    </svg>
  );
}
