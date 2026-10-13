import { nativeAuthCallback } from '../core/native-auth.js?v=0b6360114351';

export function mountNativeAuthBridge({ location = window.location, history = window.history, document = window.document } = {}) {
  const callback = nativeAuthCallback(location.href);
  if (!callback) return false;
  // Do this before creating the web Supabase client or hash router: this code belongs to the app.
  const clean = new URL(location.href);
  clean.search = ''; clean.hash = '';
  history.replaceState(null, '', clean.href);
  document.title = '返回懒懒塔罗 App';
  const meta = document.createElement('meta');
  meta.name = 'referrer'; meta.content = 'no-referrer'; document.head.append(meta);
  document.body.replaceChildren();
  document.body.className = 'native-auth-page';
  const style = document.createElement('style');
  style.textContent = '.native-auth-page{min-height:100dvh;display:grid;place-items:center;margin:0;padding:24px;box-sizing:border-box;background:#100b18;color:#f1e7d2;font:16px/1.7 system-ui,sans-serif}.native-auth-card{max-width:420px;padding:32px;border:1px solid #d8b77a33;border-radius:22px;background:#1d1528}.native-auth-card h1{font-size:26px;line-height:1.4}.native-auth-card p{color:#b9b0c4}.native-auth-card .app-link{display:block;padding:14px 20px;border-radius:12px;background:#d8b77a;color:#251b2e;text-align:center;text-decoration:none;font-weight:600}.native-auth-card .web-link{display:block;margin-top:22px;text-align:center;color:#b9b0c4}.native-auth-card small{display:block;margin-top:20px;color:#b9b0c4}';
  document.head.append(style);
  const card = document.createElement('main'); card.className = 'native-auth-card';
  const title = document.createElement('h1'); title.textContent = callback.error ? '登录链接已失效' : '回到 App，完成登录';
  const message = document.createElement('p');
  message.textContent = callback.error ? '请返回 App，重新发送登录邮件。' : '点击下面的按钮，继续使用你刚才打开的页面。';
  card.append(title, message);
  if (callback.link) {
    const button = document.createElement('a'); button.href = callback.link; button.className = 'app-link';
    button.textContent = '返回懒懒塔罗 App'; card.append(button);
  }
  const note = document.createElement('small'); note.textContent = '请在安装了 App、并发送这封登录邮件的设备上打开。'; card.append(note);
  const web = document.createElement('a'); web.href = clean.href; web.className = 'web-link'; web.textContent = '打开网页版'; card.append(web);
  document.body.append(card);
  return true;
}
