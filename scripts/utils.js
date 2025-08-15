
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export const formatTime = (sec) => { if (!isFinite(sec) || sec < 0) return "0:00"; const m = Math.floor(sec / 60); const s = Math.floor(sec % 60); return `${m}:${s.toString().padStart(2, '0')}`; };
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2);
export const toast = (msg, type = 'info') => { const c = $('#toasts'); const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; c.appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; }, 3000); setTimeout(() => el.remove(), 3600); };
export const confirmDialog = async (message) => new Promise((resolve) => { const m = document.createElement('div'); m.className = 'modal show'; m.innerHTML = `<div class="modal-card"><h3>Xác nhận</h3><p>${message}</p><div class="row" style="margin-top:10px;"><button class="btn" id="ok">Đồng ý</button><button class="btn secondary" id="cancel">Huỷ</button></div></div>`; document.body.appendChild(m); m.querySelector('#ok').onclick = () => { m.remove(); resolve(true); }; m.querySelector('#cancel').onclick = () => { m.remove(); resolve(false); }; });
