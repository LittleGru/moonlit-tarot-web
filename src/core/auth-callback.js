/** Supabase owns these URL parameters until it finishes restoring the session. */
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
