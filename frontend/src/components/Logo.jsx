export default function Logo({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="shineGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.22" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="26" fill="url(#logoGrad)" />
      <rect width="100" height="58" rx="26" fill="url(#shineGrad)" />
      <line x1="50" y1="18" x2="50" y2="82" stroke="white" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M50 34 C68 34 68 50 50 50" stroke="white" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <path d="M50 50 C32 50 32 66 50 66" stroke="white" strokeWidth="5.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
