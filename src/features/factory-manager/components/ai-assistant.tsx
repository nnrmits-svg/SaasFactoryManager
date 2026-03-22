'use client';

import { useState, useRef, useEffect } from 'react';

interface StepContext {
  title: string;
  question: string;
  hint: string;
  previousAnswers?: string;
}

interface AiAssistantProps {
  stepContext: StepContext;
  onSuggestionAccept: (text: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

let msgCounter = 0;
function genId() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

export function AiAssistant({ stepContext, onSuggestionAccept }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset messages when step changes
  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
  }, [stepContext.title]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  async function handleSend(text?: string) {
    const msg = text || inputValue.trim();
    if (!msg || isLoading) return;
    setInputValue('');

    const userMsg: ChatMessage = { id: genId(), role: 'user', content: msg };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsLoading(true);

    const assistantId = genId();

    try {
      abortRef.current = new AbortController();

      const res = await fetch('/api/ai/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          stepContext,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      // Add empty assistant message for streaming
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      // Read plain text stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === assistantId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], content: updated[idx].content + chunk };
          return updated;
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('AI error:', err);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== assistantId),
          { id: assistantId, role: 'assistant', content: 'Error al obtener respuesta. Intenta de nuevo.' },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Ayudame a responder
      </button>
    );
  }

  return (
    <div className="mt-3 border border-purple-500/20 rounded-xl bg-black/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-purple-500/10 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs font-medium text-purple-300">Asistente IA</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="max-h-48 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-xs text-gray-500 py-2">
            Preguntame cualquier cosa sobre este paso. Puedo sugerirte respuestas o ayudarte a mejorar lo que ya escribiste.
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
                msg.role === 'user'
                  ? 'bg-purple-500/20 text-purple-200'
                  : 'bg-white/5 text-gray-300'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && msg.content && (
                <button
                  type="button"
                  onClick={() => onSuggestionAccept(msg.content.trim())}
                  className="mt-1.5 flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Usar esta sugerencia
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg bg-white/5 text-xs text-gray-400">
              <span className="animate-pulse">Pensando...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 px-3 py-2 border-t border-white/5"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ej: Dame opciones para esta pregunta..."
          className="flex-1 px-3 py-1.5 bg-black/30 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Enviar
        </button>
      </form>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {[
            'Dame opciones',
            'Ayudame a definirlo',
            'No se que poner',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 text-[10px] bg-white/5 text-gray-400 border border-white/10 rounded-md hover:bg-white/10 hover:text-gray-300 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
