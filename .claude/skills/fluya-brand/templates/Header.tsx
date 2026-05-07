import React from 'react';
import Link from 'next/link';
import { FluyaLogo } from '@/shared/ui/FluyaLogo';

export interface NavLink {
    label: string;
    href: string;
}

interface FluyaHeaderProps {
    navLinks: NavLink[];
    userEmail?: string;
    rightSlot?: React.ReactNode;
    logoHref?: string;
}

export function FluyaHeader({
    navLinks,
    userEmail,
    rightSlot,
    logoHref = '/',
}: FluyaHeaderProps) {
    return (
        <header className="sticky top-0 z-50 bg-[#0B001E]/80 backdrop-blur-md border-b border-white/5">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href={logoHref} className="transition-transform hover:scale-105">
                        <FluyaLogo className="h-8" />
                    </Link>
                    <nav className="hidden md:flex items-center gap-6">
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-gray-400 hover:text-[#4AF2A1] transition-colors font-medium text-sm"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    {rightSlot}
                    {userEmail && (
                        <span className="text-sm text-gray-500 hidden sm:inline-block">
                            {userEmail}
                        </span>
                    )}
                </div>
            </div>
        </header>
    );
}
