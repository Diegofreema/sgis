import Image from '@/lib/compat/image';

export const BrandLogo = ({ className = 'h-5 w-5' }: { className?: string }) => {
  return (
    <Image
      src="/logo.jpeg"
      alt="Logo"
      className={className}
      width={40}
      height={40}
    />
  );
};
