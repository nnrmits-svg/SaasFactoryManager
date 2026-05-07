import Image from 'next/image';

export function FluyaLogo({ className = 'h-8' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/Fluya-Logo-Ult.jpg"
        alt="Fluya Studio"
        width={32}
        height={32}
        className="h-8 w-8 rounded-full"
        priority
      />
      <span className="font-bold text-xl tracking-tight text-white">
        Fluya{' '}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-fluya-purple to-fluya-green">
          Studio
        </span>
      </span>
    </div>
  );
}
