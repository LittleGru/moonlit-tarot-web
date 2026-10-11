import { isAuthCallback, loginCallbackMessage } from '../../core/auth-callback.js?v=70be6c281e08';

/** The public project key is safe only with the accompanying database RLS migration. */
export async function createNotesAuth(document, onChange, {
  location = globalThis.location, history = globalThis.history,
  loadClient = () => import('../../vendor/supabase.js'),
} = {}) {
  const url = document.querySelector('meta[name="tarot-supabase-url"]')?.content;
  const key = document.querySelector('meta[name="tarot-supabase-key"]')?.content;
  if (!url || !key) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !(key.startsWith('sb_publishable_') || key.startsWith('eyJ'))) throw new Error('个人笔记登录配置无效。');
  const callback = isAuthCallback(location);
  const callbackCode = new URLSearchParams(location.hash.replace(/^#/, '')).get('error_code');
  const { createClient } = await loadClient();
  const client = createClient(url, key, { auth: { storageKey: 'moonlit-notes-session', detectSessionInUrl: true } });
  let result;
  try {
    result = await client.auth.getSession();
  } catch (error) {
    if (!callback) throw error;
    result = { data: { session: null }, error };
  } finally {
    if (callback) {
      const query = new URLSearchParams(location.search);
      query.delete('code');
      const search = query.toString();
      history.replaceState(null, '', `${location.pathname}${search ? `?${search}` : ''}#/notes`);
    }
  }
  const { data, error } = result;
  if (error && !callback) throw new Error('登录状态无法读取，请重新登录。');
  // Auth callbacks must not await another Supabase operation inside its session lock.
  const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => onChange(session?.user ?? null, client), 0);
  });
  return { client, user: data?.session?.user ?? null,
    callbackError: callback && (error || !data?.session) ? loginCallbackMessage(error ?? { code: callbackCode }) : '',
    dispose: () => subscription.subscription.unsubscribe(),
    async signIn(email) {
      const redirect = `${location.origin}${location.pathname}`;
      const { error: signInError } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
      if (signInError?.code === 'email_address_not_authorized') {
        throw new Error('网站发信服务尚在配置中，目前仅限项目成员邮箱登录。笔记需要登录后才能保存到云端。');
      }
      if (signInError?.status === 429 || signInError?.code === 'over_email_send_rate_limit') {
        throw new Error('登录邮件发送过于频繁，请稍后再试。');
      }
      if (signInError) throw new Error('登录邮件暂时未能发送，请检查邮箱或稍后重试。');
    },
    async signOut() {
      const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
      if (signOutError) throw new Error('暂时无法退出登录，请重试。');
    },
  };
}
