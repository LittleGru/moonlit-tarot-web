/** Supabase owns these URL parameters until it finishes restoring the session. */
const pages = new Set(['home', 'draw', 'learn', 'practice', 'guide', 'notes']);
const returnKey = 'moonlit-login-return';

export function loginPageFromHash(hash) {
  const page = (hash ?? '').replace(/^#\/?/, '');
  return pages.has(page) ? page : 'notes';
}

export function rememberLoginPage(page, storage = globalThis.localStorage, now = Date.now()) {
  if (!pages.has(page)) return;
  try { storage?.setItem(returnKey, JSON.stringify({ page, at: now })); } catch { /* URL return parameter still works. */ }
}

/** Accept only site pages, never an arbitrary redirect URL. */
export function loginReturnPage(location, storage = globalThis.localStorage, now = Date.now()) {
  const requested = new URLSearchParams(location.search ?? '').get('auth_return');
  if (pages.has(requested)) return requested;
  try {
    const saved = JSON.parse(storage?.getItem(returnKey) ?? 'null');
    if (pages.has(saved?.page) && Number.isFinite(saved.at) && now >= saved.at && now - saved.at < 3600000) return saved.page;
  } catch { /* Missing or invalid local state cannot affect login. */ }
  return 'notes';
}

export function isAuthCallback(location) {
  const hash = new URLSearchParams((location.hash ?? '').replace(/^#/, ''));
  const query = new URLSearchParams(location.search ?? '');
  return hash.has('access_token') || hash.has('error') || hash.has('error_code') || query.has('code');
}

export function loginCallbackMessage(error) {
  if (error?.code === 'otp_expired' || error?.code === 'access_denied') {
    return '登录链接已失效或已使用。请重新发送邮件，并打开最新的登录链接。';
  }
  return '这次登录没有完成。请重新发送登录邮件；如果仍然失败，请稍后重试。';
}
