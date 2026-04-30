import logoSrc from "@/assets/logo.png";

interface LogoProps {
  size?: number;
  showText?: boolean;
  textClassName?: string;
  taglineClassName?: string;
  showTagline?: boolean;
  className?: string;
}

export function Logo({
  size = 36,
  showText = true,
  textClassName = "font-display font-semibold text-lg",
  taglineClassName = "text-[11px] opacity-75 leading-tight",
  showTagline = false,
  className = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoSrc}
        alt="CareSync HIV logo"
        width={size}
        height={size}
        loading="lazy"
        className="object-contain"
        style={{ width: size, height: size }}
      />
      {showText && (
        <div className="flex flex-col">
          <span className={textClassName}>CareSync HIV</span>
          {showTagline && (
            <span className={taglineClassName}>
              Smart Adherence &amp; Treatment Support
            </span>
          )}
        </div>
      )}
    </div>
  );
}
