interface WasteSmartLogoProps {
  variant?: 'light-surface' | 'dark-surface';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function WasteSmartLogo({
  variant = 'light-surface',
  size = 'md',
  className = '',
}: WasteSmartLogoProps) {
  const heightClass =
    size === 'sm' ? 'h-9' : size === 'lg' ? 'h-14' : 'h-11';
  const src =
    variant === 'dark-surface'
      ? '/assets/images/wastesmart-logo-light.svg'
      : '/assets/images/wastesmart-logo.svg';

  return (
    <img
      src={src}
      alt="WasteSmart — Smart Urban Waste Management"
      referrerPolicy="no-referrer"
      className={`${heightClass} w-auto select-none object-contain ${className}`}
    />
  );
}
