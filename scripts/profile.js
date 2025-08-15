import { users, session } from './storage.js';

export const profile = {
  getCurrent() {
    const s = session.current();
    if (!s?.username) return null;
    return users.get(s.username) || {};
  },
  updateProfile({ name, avatar }) {
    const s = session.current();
    if (!s?.username) throw new Error('Chưa đăng nhập');
    const u = users.get(s.username) || {};
    if (name) u.name = name;
    if (avatar) u.avatar = avatar;
    users.upsert(s.username, u);
  },
  async changePassword(oldPass, newPass) {
    const s = session.current();
    if (!s?.username) throw new Error('Chưa đăng nhập');
    const u = users.get(s.username) || {};
    // Giả sử passHash đã lưu là SHA-256
    async function sha256(text) {
      const enc = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const oldHash = await sha256(oldPass);
    if (u.passHash !== oldHash) throw new Error('Mật khẩu cũ không đúng');
    u.passHash = await sha256(newPass);
    users.upsert(s.username, u);
  }
};
