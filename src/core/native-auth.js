/** Forward only a PKCE authorization code. Access and refresh tokens never leave this page. */
export function nativeAuthCallback(href) {
  const url = new URL(href);
  if (url.searchParams.get('auth_native') !== '1') return null;
  const state = url.searchParams.get('auth_state') ?? '';
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(state)) return { error: true, link: null };
  const fragment = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get('code');
  const failed = url.searchParams.has('error') || url.searchParams.has('error_code') || fragment.has('error') || fragment.has('error_code');
  const callback = new URL('moonlittarot://auth/callback');
  callback.searchParams.set('state', state);
  if (failed) callback.searchParams.set('error', 'expired_link');
  else if (code && code.length <= 4096) callback.searchParams.set('code', code);
  else return { error: true, link: null };
  return { error: failed, link: callback.href };
}
