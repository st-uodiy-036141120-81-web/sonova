import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';
import AppealForm from '../AppealForm';
import {
  SettingGroup,
  SettingRange,
  SettingSelect,
  SettingText,
  SettingToggle,
} from './SettingControls';
import { POPULAR_TAGS } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import type { UserSettings } from '../../lib/userSettings';
import type { Profile, Studio } from '../../lib/types';

type Patch = (p: Partial<UserSettings>) => void;

interface PanelsProps {
  tab: string;
  settings: UserSettings;
  updateSettings: Patch;
  profile: Profile;
  studio: Studio | null;
  userEmail?: string;
  emailVerified: boolean;
  isEmailAuth: boolean;
  onProfileSave?: () => void;
  onResetTaste?: () => void;
  onExport?: () => void;
  onDeleteAccount?: () => void;
  onResendVerify?: () => void;
  blocked?: Profile[];
  onUnblock?: (id: string) => void;
  totpSecret?: string;
  onEnable2fa?: () => void;
  onDisable2fa?: () => void;
  onEnablePush?: () => void;
  pushDone?: boolean;
  referralLink?: string | null;
}

export default function SettingsPanels({
  tab,
  settings,
  updateSettings,
  profile,
  studio,
  userEmail,
  emailVerified,
  isEmailAuth,
  onResetTaste,
  onExport,
  onDeleteAccount,
  onResendVerify,
  blocked,
  onUnblock,
  totpSecret,
  onEnable2fa,
  onDisable2fa,
  onEnablePush,
  pushDone,
  referralLink,
}: PanelsProps) {
  const { t } = useTranslation();
  const { setTheme } = useTheme();

  if (tab === 'privacy') {
    return (
      <SettingGroup>
        <SettingSelect
          label={t('settings.fields.dmPolicy')}
          value={settings.dmPolicy}
          onChange={(v) => updateSettings({ dmPolicy: v })}
          options={[
            { value: 'everyone', label: t('settings.options.everyone') },
            { value: 'following', label: t('settings.options.followersOnly') },
            { value: 'none', label: t('settings.options.nobody') },
          ]}
        />
        <SettingSelect
          label={t('settings.fields.studioVisibility')}
          value={settings.studioVisibility}
          onChange={(v) => updateSettings({ studioVisibility: v })}
          options={[
            { value: 'public', label: t('settings.options.public') },
            { value: 'followers', label: t('settings.options.followersOnly') },
            { value: 'private', label: t('settings.options.private') },
          ]}
        />
        <SettingToggle label={t('settings.fields.hideListening')} checked={settings.hideListeningActivity} onChange={(v) => updateSettings({ hideListeningActivity: v })} />
        <SettingToggle label={t('settings.fields.hideFollowLists')} checked={settings.hideFollowLists} onChange={(v) => updateSettings({ hideFollowLists: v })} />
        <SettingToggle label={t('settings.fields.voiceDm')} checked={settings.voiceDmEnabled} onChange={(v) => updateSettings({ voiceDmEnabled: v })} />
        <SettingSelect
          label={t('settings.fields.shoutoutPolicy')}
          value={settings.shoutoutPolicy}
          onChange={(v) => updateSettings({ shoutoutPolicy: v })}
          options={[
            { value: 'allow', label: t('settings.options.allow') },
            { value: 'approval', label: t('settings.options.approval') },
            { value: 'deny', label: t('settings.options.deny') },
          ]}
        />
      </SettingGroup>
    );
  }

  if (tab === 'notifications') {
    return (
      <SettingGroup>
        <SettingToggle label={t('settings.fields.notifyLike')} checked={settings.notifyLike} onChange={(v) => updateSettings({ notifyLike: v })} />
        <SettingToggle label={t('settings.fields.notifyComment')} checked={settings.notifyComment} onChange={(v) => updateSettings({ notifyComment: v })} />
        <SettingToggle label={t('settings.fields.notifyFollow')} checked={settings.notifyFollow} onChange={(v) => updateSettings({ notifyFollow: v })} />
        <SettingToggle label={t('settings.fields.notifyMessage')} checked={settings.notifyMessage} onChange={(v) => updateSettings({ notifyMessage: v })} />
        <SettingToggle label={t('settings.fields.notifyTransfer')} checked={settings.notifyTransfer} onChange={(v) => updateSettings({ notifyTransfer: v })} />
        <SettingToggle label={t('settings.fields.notifyLive')} checked={settings.notifyLive} onChange={(v) => updateSettings({ notifyLive: v })} />
        <SettingToggle label={t('settings.fields.notifyEmailDigest')} checked={settings.notifyEmailDigest} onChange={(v) => updateSettings({ notifyEmailDigest: v })} />
        <SettingToggle label={t('settings.fields.liveAlertsFollowing')} checked={settings.liveAlertsOnlyFollowing} onChange={(v) => updateSettings({ liveAlertsOnlyFollowing: v })} />
        <SettingToggle label={t('settings.fields.dndEnabled')} checked={settings.dndEnabled} onChange={(v) => updateSettings({ dndEnabled: v })} />
        {settings.dndEnabled && (
          <>
            <SettingText label={t('settings.fields.dndStart')} value={settings.dndStart} onChange={(v) => updateSettings({ dndStart: v })} placeholder="23:00" />
            <SettingText label={t('settings.fields.dndEnd')} value={settings.dndEnd} onChange={(v) => updateSettings({ dndEnd: v })} placeholder="08:00" />
          </>
        )}
      </SettingGroup>
    );
  }

  if (tab === 'playback') {
    return (
      <SettingGroup>
        <SettingSelect
          label={t('settings.fields.defaultSpeed')}
          value={String(settings.defaultSpeed) as '0.75' | '1' | '1.25' | '1.5'}
          onChange={(v) => updateSettings({ defaultSpeed: Number(v) })}
          options={[
            { value: '0.75', label: '0.75x' },
            { value: '1', label: '1x' },
            { value: '1.25', label: '1.25x' },
            { value: '1.5', label: '1.5x' },
          ]}
        />
        <SettingSelect
          label={t('settings.fields.audioQuality')}
          value={settings.audioQuality}
          onChange={(v) => updateSettings({ audioQuality: v })}
          options={[
            { value: 'high', label: t('settings.options.qualityHigh') },
            { value: 'medium', label: t('settings.options.qualityMedium') },
            { value: 'data-saver', label: t('settings.options.qualitySaver') },
          ]}
        />
        <SettingToggle label={t('settings.fields.loudnessNormalize')} checked={settings.loudnessNormalize} onChange={(v) => updateSettings({ loudnessNormalize: v })} />
        <SettingRange label={t('settings.fields.crossfade')} value={settings.crossfadeSeconds} min={0} max={5} unit="s" onChange={(v) => updateSettings({ crossfadeSeconds: v })} />
        <SettingSelect
          label={t('settings.fields.defaultSleep')}
          value={String(settings.defaultSleepMinutes) as '0' | '15' | '30' | '60'}
          onChange={(v) => updateSettings({ defaultSleepMinutes: Number(v) })}
          options={[
            { value: '0', label: t('settings.options.off') },
            { value: '15', label: '15 min' },
            { value: '30', label: '30 min' },
            { value: '60', label: '60 min' },
          ]}
        />
        <SettingToggle label={t('settings.fields.feedAutoplay')} checked={settings.feedAutoplay} onChange={(v) => updateSettings({ feedAutoplay: v })} />
      </SettingGroup>
    );
  }

  if (tab === 'reels') {
    return (
      <SettingGroup>
        <SettingToggle label={t('settings.fields.reelsAutoplay')} checked={settings.reelsAutoplay} onChange={(v) => updateSettings({ reelsAutoplay: v })} />
        <SettingToggle label={t('settings.fields.reelsMuted')} checked={settings.reelsMuted} onChange={(v) => updateSettings({ reelsMuted: v })} />
        <SettingRange label={t('settings.fields.explorationLevel')} description={t('settings.fields.explorationHint')} value={settings.explorationLevel} min={0} max={100} unit="%" onChange={(v) => updateSettings({ explorationLevel: v })} />
        <SettingToggle label={t('settings.fields.hideRemixes')} checked={settings.hideRemixes} onChange={(v) => updateSettings({ hideRemixes: v })} />
        <SettingToggle label={t('settings.fields.hideLongSongs')} checked={settings.hideLongSongs} onChange={(v) => updateSettings({ hideLongSongs: v })} />
        <SettingToggle label={t('settings.fields.hideFollowersOnly')} checked={settings.hideFollowersOnly} onChange={(v) => updateSettings({ hideFollowersOnly: v })} />
        <button type="button" onClick={onResetTaste} className="w-full rounded-xl bg-white/10 py-2.5 text-sm text-[var(--text-primary)] hover:bg-white/15">
          {t('settings.resetTaste')}
        </button>
      </SettingGroup>
    );
  }

  if (tab === 'studio') {
    return (
      <SettingGroup>
        <SettingToggle label={t('settings.fields.defaultUploadDraft')} checked={settings.defaultUploadDraft} onChange={(v) => updateSettings({ defaultUploadDraft: v })} />
        <SettingText label={t('settings.fields.defaultCity')} value={settings.defaultCity} onChange={(v) => updateSettings({ defaultCity: v })} />
        <SettingToggle label={t('settings.fields.allowDownloads')} checked={settings.allowDownloads} onChange={(v) => updateSettings({ allowDownloads: v })} />
        <SettingToggle label={t('settings.fields.allowEmbed')} checked={settings.allowEmbed} onChange={(v) => updateSettings({ allowEmbed: v })} />
        <SettingSelect
          label={t('settings.fields.autoAcceptTransfers')}
          value={settings.autoAcceptTransfers}
          onChange={(v) => updateSettings({ autoAcceptTransfers: v })}
          options={[
            { value: 'none', label: t('settings.options.none') },
            { value: 'trusted', label: t('settings.options.trusted') },
          ]}
        />
        <SettingText label={t('settings.fields.timezone')} value={settings.timezone} onChange={(v) => updateSettings({ timezone: v })} />
        <SettingToggle label={t('settings.fields.liveNotifyFollowers')} checked={settings.liveNotifyFollowers} onChange={(v) => updateSettings({ liveNotifyFollowers: v })} />
        <SettingToggle label={t('settings.fields.liveRecordSession')} checked={settings.liveRecordSession} onChange={(v) => updateSettings({ liveRecordSession: v })} />
        <SettingToggle label={t('settings.fields.liveCommentsEnabled')} checked={settings.liveCommentsEnabled} onChange={(v) => updateSettings({ liveCommentsEnabled: v })} />
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">{t('settings.fields.defaultTags')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const next = settings.defaultTags.includes(tag)
                    ? settings.defaultTags.filter((x) => x !== tag)
                    : [...settings.defaultTags, tag].slice(0, 3);
                  updateSettings({ defaultTags: next });
                }}
                className={`rounded-lg px-2.5 py-1 text-xs ${settings.defaultTags.includes(tag) ? 'bg-blue-700 text-white' : 'bg-white/10 text-[var(--text-muted)]'}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
        {studio && (
          <p className="text-xs text-[var(--text-muted)]">
            {t('settings.studioHint')}: @{profile.username}
          </p>
        )}
      </SettingGroup>
    );
  }

  if (tab === 'social') {
    return (
      <SettingGroup>
        <SettingSelect
          label={t('settings.fields.status')}
          value={settings.status}
          onChange={(v) => updateSettings({ status: v })}
          options={[
            { value: 'available', label: t('settings.options.available') },
            { value: 'busy', label: t('settings.options.busy') },
            { value: 'no-dms', label: t('settings.options.noDms') },
          ]}
        />
        <SettingToggle label={t('settings.fields.autoReplyEnabled')} checked={settings.autoReplyEnabled} onChange={(v) => updateSettings({ autoReplyEnabled: v })} />
        {settings.autoReplyEnabled && (
          <SettingText label={t('settings.fields.autoReplyMessage')} value={settings.autoReplyMessage} onChange={(v) => updateSettings({ autoReplyMessage: v })} multiline />
        )}
        <SettingToggle label={t('settings.fields.tipsEnabled')} checked={settings.tipsEnabled} onChange={(v) => updateSettings({ tipsEnabled: v })} />
        <SettingRange label={t('settings.fields.tipsMinAmount')} value={settings.tipsMinAmount} min={1} max={100} onChange={(v) => updateSettings({ tipsMinAmount: v })} />
        <SettingText label={t('settings.fields.tipsThankYou')} value={settings.tipsThankYou} onChange={(v) => updateSettings({ tipsThankYou: v })} multiline />
      </SettingGroup>
    );
  }

  if (tab === 'display') {
    return (
      <SettingGroup>
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-sm text-[var(--text-primary)]">{t('settings.language')}</p>
          <div className="mt-2"><LanguageSwitcher /></div>
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-sm text-[var(--text-primary)]">{t('settings.theme')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
          {(['dark', 'light', 'amoled'] as const).map((th) => (
            <button key={th} type="button" onClick={() => setTheme(th)} className="rounded-xl bg-white/10 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-white/15">
              {t(`theme.${th}`)}
            </button>
          ))}
          </div>
        </div>
        <SettingSelect
          label={t('settings.fields.fontScale')}
          value={settings.fontScale}
          onChange={(v) => updateSettings({ fontScale: v })}
          options={[
            { value: 'sm', label: t('settings.options.fontSm') },
            { value: 'md', label: t('settings.options.fontMd') },
            { value: 'lg', label: t('settings.options.fontLg') },
          ]}
        />
        <SettingToggle label={t('settings.fields.reduceMotion')} checked={settings.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} />
        <SettingToggle label={t('settings.fields.highContrast')} checked={settings.highContrast} onChange={(v) => updateSettings({ highContrast: v })} />
        <SettingSelect
          label={t('settings.fields.homeLayout')}
          value={settings.homeLayout}
          onChange={(v) => updateSettings({ homeLayout: v })}
          options={[
            { value: 'reels', label: t('nav.reels') },
            { value: 'feed', label: t('nav.feed') },
            { value: 'discover', label: t('nav.discover') },
          ]}
        />
        <SettingToggle label={t('settings.fields.keyboardShortcuts')} checked={settings.keyboardShortcuts} onChange={(v) => updateSettings({ keyboardShortcuts: v })} />
      </SettingGroup>
    );
  }

  if (tab === 'storage') {
    return (
      <SettingGroup>
        <SettingRange label={t('settings.fields.cacheLimitMb')} value={settings.cacheLimitMb} min={100} max={2000} step={100} unit=" MB" onChange={(v) => updateSettings({ cacheLimitMb: v })} />
        <SettingToggle label={t('settings.fields.wifiOnlyDownload')} checked={settings.wifiOnlyDownload} onChange={(v) => updateSettings({ wifiOnlyDownload: v })} />
        <button
          type="button"
          onClick={() => {
            if ('caches' in window) void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
          }}
          className="w-full rounded-xl bg-white/10 py-2.5 text-sm text-[var(--text-primary)]"
        >
          {t('settings.clearCache')}
        </button>
        <p className="text-xs text-[var(--text-muted)]">{t('settings.billingSoon')}</p>
      </SettingGroup>
    );
  }

  if (tab === 'security') {
    return (
      <SettingGroup>
        {profile.totp_enabled ? (
          <button type="button" onClick={onDisable2fa} className="rounded-xl bg-red-600/80 px-4 py-2 text-sm text-white">{t('settings.disable2fa')}</button>
        ) : (
          <button type="button" onClick={onEnable2fa} className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white">{t('settings.enable2fa')}</button>
        )}
        {totpSecret && <p className="text-xs text-[var(--text-muted)]">{t('settings.totpSecret')}: {totpSecret}</p>}
        <button type="button" onClick={onEnablePush} className="rounded-xl bg-white/10 px-4 py-2 text-sm text-[var(--text-primary)]">
          {pushDone ? t('settings.pushEnabled') : t('settings.enablePush')}
        </button>
        {referralLink && (
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs text-[var(--text-primary)]">{t('referral.title')}</p>
            <p className="mt-1 break-all text-xs text-blue-400">{referralLink}</p>
          </div>
        )}
        <AppealForm />
        {blocked && blocked.length > 0 ? (
          blocked.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <span className="text-sm">@{p.username}</span>
              <button type="button" onClick={() => onUnblock?.(p.id)} className="text-xs text-blue-400">{t('studio.unblock')}</button>
            </div>
          ))
        ) : (
          <p className="text-xs text-[var(--text-muted)]">{t('settings.noBlocked')}</p>
        )}
        <button type="button" onClick={onExport} className="w-full rounded-xl bg-white/10 py-2.5 text-sm text-[var(--text-primary)]">{t('settings.exportData')}</button>
        <button type="button" onClick={onDeleteAccount} className="w-full rounded-xl bg-red-600/80 py-2.5 text-sm text-white">{t('settings.deleteAccount')}</button>
      </SettingGroup>
    );
  }

  if (tab === 'account') {
    return (
      <SettingGroup>
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">{t('settings.email')}</p>
          <p className="text-sm text-[var(--text-primary)]">{userEmail}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{emailVerified ? t('settings.emailVerified') : t('settings.emailUnverified')}</p>
          {!emailVerified && (
            <button type="button" onClick={onResendVerify} className="mt-2 text-xs text-blue-400">{t('settings.resendVerify')}</button>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">{t('settings.sessionThisDevice')}</p>
        {userEmail && (
          <p className="text-xs text-[var(--text-muted)]">{t('settings.lastSignIn')}: {new Date().toLocaleString()}</p>
        )}
        <p className="text-xs text-[var(--text-muted)]">{t('settings.connectGoogle')} / {t('settings.connectApple')} — {t('settings.billingSoon')}</p>
        {!isEmailAuth && <p className="text-xs text-amber-300">{t('auth.oauthNoPassword')}</p>}
      </SettingGroup>
    );
  }

  return null;
}
