import Image from '@/lib/compat/image';

export const BrandLogo = () => {
  return (
    <Image
      src="/logo.jpeg"
      alt="Logo"
      className="h-5 w-5"
      width={20}
      height={20}
    />
  );
};
