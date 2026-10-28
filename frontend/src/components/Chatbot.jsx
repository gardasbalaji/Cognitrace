
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, LoaderCircle } from 'lucide-react';
import { apiRequest } from '../services/api';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm CogniTrace AI. Ask me anything about your studies!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async (event) => {
    event?.preventDefault();

    const message = input.trim();

    if (!message || loading) return;

    setError('');
    setInput('');
    setMessages((previous) => [
      ...previous,
      { role: 'user', content: message },
    ]);
    setLoading(true);

    try {
      const result = await apiRequest('/api/student/chatbot', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      if (!result?.reply) {
        throw new Error('The chatbot returned an empty response.');
      }

      setMessages((previous) => [
        ...previous,
        { role: 'assistant', content: result.reply },
      ]);
    } catch (err) {
      setError(
        err?.message || 'Unable to contact the AI chatbot. Please try again.'
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {/* Floating chatbot button */}
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? 'Close AI chatbot' : 'Open AI chatbot'}
        aria-expanded={isOpen}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-primary-400/40 bg-primary-600 text-2xl text-white shadow-xl transition hover:scale-105 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
      >
        {isOpen ? <X size={24} /> : '🤖'}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <section
          role="dialog"
          aria-label="CogniTrace AI chatbot"
          className="fixed bottom-24 right-4 z-50 flex h-[min(520px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl sm:right-6"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600/20 text-xl">
                🤖
              </div>
              <div>
                <h2 className="text-sm font-bold">CogniTrace AI</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Your study assistant
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X size={19} />
            </button>
          </header>

          {/* Messages */}
          <div
            className="flex-1 space-y-4 overflow-y-auto bg-slate-950 p-4"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-sm bg-primary-600 text-white'
                      : 'rounded-bl-sm border border-slate-700 bg-slate-900 text-slate-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                  <LoaderCircle size={16} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="border-t border-rose-900/50 bg-rose-950/40 px-4 py-2 text-xs text-rose-300"
            >
              {error}
              <button
                type="button"
                onClick={() => setError('')}
                className="ml-2 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="flex items-end gap-2 border-t border-slate-700 bg-slate-900 p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask me anything..."
              aria-label="Your message"
              rows={1}
              maxLength={4000}
              disabled={loading}
              className="max-h-24 min-h-11 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-primary-500 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
