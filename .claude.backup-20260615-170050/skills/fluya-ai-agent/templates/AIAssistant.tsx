'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

// Adaptá estas sugerencias al dominio de la app target
const SUGGESTIONS = [
    '¿Cómo funciona la plataforma?',
    '¿Cuáles son los planes disponibles?',
    '¿Cómo configuro mi cuenta?',
    '¿Cuáles son las últimas novedades?',
];

const WELCOME_MESSAGE: Message = {
    role: 'assistant',
    content:
        '¡Hola! Soy AI Fluya, tu asistente inteligente. Puedo ayudarte con cualquier duda sobre la plataforma. ¿En qué puedo ayudarte?',
};

function AIAvatar() {
    return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-fluya-purple to-fluya-blue flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            <Sparkles className="h-4 w-4 text-white" />
        </div>
    );
}

export function AIAssistant() {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

            if (!response.ok) {
                throw new Error('Error al conectar con el asistente');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No stream available');

            const decoder = new TextDecoder();
            let assistantContent = '';

            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                assistantContent += chunk;

                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: 'assistant',
                        content: assistantContent,
                    };
                    return updated;
                });
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        'Lo siento, hubo un error al procesar tu consulta. Por favor intentá de nuevo o contactá a soporte.',
                },
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

    const showSuggestions = messages.length <= 1;

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="h-[400px] overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="flex flex-col items-center mr-2 mt-1">
                                    <AIAvatar />
                                    {idx === 0 && (
                                        <span className="text-[10px] text-fluya-purple font-semibold mt-1">
                                            AI Fluya
                                        </span>
                                    )}
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                                    msg.role === 'user'
                                        ? 'bg-fluya-purple text-white rounded-br-md'
                                        : 'bg-white/10 text-gray-200 rounded-bl-md'
                                }`}
                            >
                                {msg.content}
                                {msg.role === 'assistant' && msg.content === '' && isLoading && (
                                    <span className="inline-flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {showSuggestions && (
                    <div className="px-4 sm:px-6 pb-3 flex flex-wrap gap-2">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => sendMessage(s)}
                                disabled={isLoading}
                                className="px-3 py-1.5 text-xs rounded-full bg-fluya-purple/20 text-fluya-purple border border-fluya-purple/30 hover:bg-fluya-purple/30 transition-colors disabled:opacity-50"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="border-t border-white/10 p-3 sm:p-4 flex gap-2"
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribí tu pregunta..."
                        disabled={isLoading}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-fluya-purple transition-colors disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-2.5 bg-fluya-purple text-white rounded-xl hover:bg-fluya-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
