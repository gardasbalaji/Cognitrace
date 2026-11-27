
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
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[#315C46]/30 bg-[#315C46] text-2xl text-white shadow-xl transition hover:scale-105 hover:bg-[#E2E8D8] focus:outline-none focus:ring-2 focus:ring-[#315C46]"
      >
        {isOpen ? <X size={24} /> : '🤖'}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <section
          role="dialog"
          aria-label="CogniTrace AI chatbot"
          className="fixed bottom-24 right-4 z-50 flex h-[min(520px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-[#D9E1D2] bg-[#F8F8F2] text-[#26332A] shadow-2xl sm:right-6"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-[#E2E7DD] bg-[#EFF1E7] px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCFCF8] border border-[#D9E1D2] text-xl">
                🤖
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#26332A]">CogniTrace AI</h2>
                <p className="mt-0.5 text-xs text-[#68766B]">
                  Your study assistant
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
              className="rounded-lg p-2 text-[#68766B] transition hover:bg-[#E8EDE1] hover:text-[#26332A]"
            >
              <X size={19} />
            </button>
          </header>

          {/* Messages */}
          <div
            className="flex-1 space-y-4 overflow-y-auto bg-[#F8F8F2] p-4"
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
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-sm bg-[#315C46] text-white shadow-sm'
                      : 'rounded-bl-sm border border-[#D9E1D2] bg-[#E2E8D8] text-[#26332A]'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-[#D9E1D2] bg-[#E2E8D8] px-4 py-3 text-xs sm:text-sm text-[#68766B]">
                  <LoaderCircle size={16} className="animate-spin text-[#315C46]" />
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
              className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700"
            >
              {error}
              <button
                type="button"
                onClick={() => setError('')}
                className="ml-2 underline font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="flex items-end gap-2 border-t border-[#E2E7DD] bg-[#EFF1E7] p-3"
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
              className="max-h-24 min-h-11 flex-1 resize-y rounded-xl border border-[#D9E1D2] bg-[#FCFCF8] px-3 py-3 text-xs sm:text-sm text-[#26332A] outline-none placeholder:text-[#68766B] focus:border-[#315C46] disabled:opacity-60 font-medium"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#315C46] text-white transition hover:bg-[#E2E8D8] disabled:cursor-not-allowed disabled:opacity-40"
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
