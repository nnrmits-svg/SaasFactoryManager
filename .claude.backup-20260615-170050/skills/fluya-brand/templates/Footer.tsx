import React from 'react';
import Link from 'next/link';
import { FluyaLogo } from '@/shared/ui/FluyaLogo';

interface FluyaFooterProps {
    appName: string;
    year?: number;
    extraLinks?: Array<{ label: string; href: string }>;
}

export function FluyaFooter({ appName, year, extraLinks = [] }: FluyaFooterProps) {
    const currentYear = year ?? new Date().getFullYear();
    const links = [
        { label: 'Términos', href: '/terms' },
        { label: 'Privacidad', href: '/privacy' },
        { label: 'Contacto', href: '/contact' },
        ...extraLinks,
    ];

    return (
        <footer className="bg-[#05000F] border-t border-white/5 py-8 mt-auto">
            <div className="container mx-auto px-4 text-center">
                <div className="flex justify-center mb-6">
                    <FluyaLogo className="h-6" />
                </div>
                <div className="flex justify-center flex-wrap gap-6 mb-6 text-sm font-medium text-gray-500">
                    {links.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="hover:text-white transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
                <p className="text-xs text-gray-600 font-medium">
                    © {currentYear} {appName}. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
