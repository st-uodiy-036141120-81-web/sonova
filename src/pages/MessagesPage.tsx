import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/PageLayout';
import VoiceRecorder from '../components/VoiceRecorder';
import { useAuth } from '../context/AuthContext';
import { useRealtimeMessages } from '../hooks/useRealtime';
import { fetchConversations, fetchConversation, sendMessage } from '../lib/apiExtended';
import type { Conversation, DirectMessage } from '../lib/types';

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const partnerParam = params.get('user') ?? params.get('to');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(partnerParam);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(() => {
    if (!user) return;
    fetchConversations(user.id).then(setConversations).finally(() => setLoading(false));
  }, [user]);

  const loadMessages = useCallback(() => {
    if (!user || !activePartnerId) return;
    fetchConversation(user.id, activePartnerId).then(setMessages);
  }, [user, activePartnerId]);

  useEffect(() => {
    if (!authLoading && !user) window.location.href = '/login';
  }, [user, authLoading]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (partnerParam) setActivePartnerId(partnerParam);
  }, [partnerParam]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useRealtimeMessages(user?.id, activePartnerId ?? undefined, loadMessages);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activePartnerId || !text.trim()) return;
    await sendMessage(user.id, activePartnerId, text.trim());
    setText('');
    loadMessages();
    loadConversations();
  };

  const activePartner = conversations.find((c) => c.partner.id === activePartnerId)?.partner;

  return (
    <PageLayout className="mx-auto flex h-screen max-w-4xl flex-col px-4 pb-28 pt-24 sm:flex-row sm:pt-28">
      <aside className="mb-4 w-full shrink-0 sm:mb-0 sm:w-64 sm:pr-4">
        <h1 className="mb-4 text-xl text-[var(--text-primary)]">{t('messages.title')}</h1>
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">{t('common.loading')}</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t('messages.noConversations')}</p>
        ) : (
          <div className="space-y-1">
            {conversations.map((c) => (
              <button
                key={c.partner.id}
                type="button"
                onClick={() => {
                  setActivePartnerId(c.partner.id);
                  setParams({ user: c.partner.id });
                }}
                className={`liquid-glass w-full rounded-xl p-3 text-start transition-colors ${
                  activePartnerId === c.partner.id ? 'ring-1 ring-blue-500' : ''
                }`}
              >
                <p className="text-sm text-[var(--text-primary)]">@{c.partner.username}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{c.lastMessage.content}</p>
                {c.unread > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-blue-700 px-1.5 text-[10px] text-white">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="liquid-glass flex flex-1 flex-col rounded-2xl p-4" style={{ background: 'var(--glass-bg)' }}>
        {!activePartnerId ? (
          <p className="m-auto text-sm text-[var(--text-muted)]">{t('messages.selectUser')}</p>
        ) : (
          <>
            <p className="mb-4 border-b border-white/10 pb-3 text-sm text-[var(--text-primary)]">
              @{activePartner?.username}
            </p>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        mine ? 'bg-blue-700 text-white' : 'bg-white/10 text-[var(--text-primary)]'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSend} className="mt-4 flex gap-2">
              {user && activePartnerId && (
                <VoiceRecorder senderId={user.id} receiverId={activePartnerId} onSent={loadMessages} />
              )}
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('messages.placeholder')}
                className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none"
              />
              <button type="submit" className="rounded-xl bg-blue-700 px-4 text-sm text-white">
                {t('messages.send')}
              </button>
            </form>
          </>
        )}
      </section>
    </PageLayout>
  );
}
