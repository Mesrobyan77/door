import Image from 'next/image';

export function BrandLogo({
  src,
  name = 'Hdoors',
  lightSurface = false,
}: {
  src: string;
  name?: string;
  lightSurface?: boolean;
}) {
  return (
    <span className={`brand-logo-area ${lightSurface ? 'bg-[#f7f4f0]' : ''}`}>
      <Image src={src} alt={name} width={174} height={58} className="brand-logo" priority />
    </span>
  );
}
