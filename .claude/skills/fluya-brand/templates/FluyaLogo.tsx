import React from 'react';

export const FluyaLogo = ({ className = "h-8" }: { className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <img
            src="/Fluya-Logo-Ult.jpg"
            alt="Fluya Studio"
            className="h-8 w-8 rounded-full"
        />
        <span className="font-bold text-xl tracking-tight text-white">
            Fluya <span className="bg-clip-text text-transparent bg-gradient-to-r from-fluya-purple to-fluya-green">Studio</span>
        </span>
    </div>
);
