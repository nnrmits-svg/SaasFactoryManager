'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const WELCOME_MESSAGE: Message = {
    role: 'assistant',
    content: '¡Hola! Soy AI Fluya, tu asistente inteligente. ¿En qué puedo ayudarte?',
};

// Adaptá estas sugerencias al dominio de la app target
const SUGGESTIONS = [
    '¿Cómo funciona la plataforma?',
    '¿Cuáles son los planes disponibles?',
    '¿Cómo configuro mi cuenta?',
    '¿Cuáles son las últimas novedades?',
];

export function ChatbotWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const sb = createClient();
        sb.auth.getSession().then(({ data }) => {
            setIsAuthenticated(!!data.session);
        });
        const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    if (!isAuthenticated) return null;

    async function sendMessage(text: string) {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: text.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/help/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updatedMessages.filter((m) => m !== WELCOME_MESSAGE),
                }),
            });

            if (!response.ok) throw new Error('Error al conectar');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No stream');

            const decoder = new TextDecoder();
            let assistantContent = '';
            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                assistantContent += decoder.decode(value, { stream: true });
                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                    return updated;
                });
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Lo siento, hubo un error. Intentá de nuevo.' },
            ]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        sendMessage(input);
    }

    return (
        <>
            {open && (
                <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[340px] sm:w-[380px] max-h-[500px] flex flex-col bg-[#0B001E] border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#1a0a2e] to-[#0B001E]">
                        <Image
                            src="/fluyabot.png"
                            alt="AI Fluya"
                            width={36}
                            height={36}
                            className="rounded-full"
                        />
                        <div className="flex-1">
                            <p className="text-white text-sm font-semibold">AI Fluya</p>
                            <p className="text-[11px] text-green-400">En línea</p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[340px] scrollbar-thin">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <Image
                                        src="/fluyabot.png"
                                        alt="AI Fluya"
                                        width={28}
                                        height={28}
                                        className="rounded-full mr-2 mt-1 flex-shrink-0"
                                    />
                                )}
                                <div
                                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                                        msg.role === 'user'
                                            ? 'bg-fluya-purple text-white rounded-br-md'
                                            : 'bg-white/10 text-gray-200 rounded-bl-md'
                                    }`}
                                >
                                    {msg.content}
                                    {msg.role === 'assistant' && msg.content === '' && isLoading && (
                                        <span className="inline-flex gap-1">
                                            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {messages.length <= 1 && (
                        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                            {SUGGESTIONS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => sendMessage(s)}
                                    disabled={isLoading}
                                    className="px-2.5 py-1 text-[10px] rounded-full bg-fluya-purple/20 text-fluya-purple border border-fluya-purple/30 hover:bg-fluya-purple/30 transition-colors disabled:opacity-50"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="border-t border-white/10 p-3 flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribí tu pregunta..."
                            disabled={isLoading}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-fluya-purple transition-colors disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="px-3 py-2 bg-fluya-purple text-white rounded-xl hover:bg-fluya-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="h-3.5 w-3.5" />
                        </button>
                    </form>
                </div>
            )}

            <button
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105 transition-all overflow-hidden border-2 border-fluya-purple/50 hover:border-fluya-purple"
                aria-label={open ? 'Cerrar asistente' : 'Abrir asistente AI Fluya'}
            >
                <Image
                    src="/fluyabot.png"
                    alt="AI Fluya"
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                />
            </button>
        </>
    );
}
