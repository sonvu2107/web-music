
import { uid } from './utils.js';
const DB_NAME = 'flowplay-db'; const DB_VERSION = 1; let dbPromise = null;
function openDB() { if (dbPromise) return dbPromise; dbPromise = new Promise((resolve, reject) => { const req = indexedDB.open(DB_NAME, DB_VERSION); req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('tracks')) { const s = db.createObjectStore('tracks', { keyPath: 'id' }); s.createIndex('createdAt', 'createdAt'); } if (!db.objectStoreNames.contains('blobs')) { db.createObjectStore('blobs', { keyPath: 'id' }); } }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); return dbPromise; }
async function withStore(name, mode, fn) { const db = await openDB(); return new Promise((resolve, reject) => { const tx = db.transaction(name, mode); const store = tx.objectStore(name); const req = fn(store); tx.oncomplete = () => resolve(req?.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); }
export const idb = { async putTrack(track) { return withStore('tracks', 'readwrite', s => s.put(track)); }, async getTrack(id) { return withStore('tracks', 'readonly', s => s.get(id)); }, async getAllTracks() { return withStore('tracks', 'readonly', s => s.getAll()); }, async deleteTrack(id) { await withStore('tracks', 'readwrite', s => s.delete(id)); await withStore('blobs', 'readwrite', s => s.delete(id)); }, async putBlob(id, blob) { return withStore('blobs', 'readwrite', s => s.put({ id, blob })); }, async getBlob(id) { return withStore('blobs', 'readonly', s => s.get(id)); }, };
const LS = { users: 'flowplay.users', session: 'flowplay.session', data: (u) => `flowplay.data.${u}` };
const getJSON = (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } };
const setJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
export const session = { current() { return getJSON(LS.session, null); }, set(user) { setJSON(LS.session, user); }, clear() { localStorage.removeItem(LS.session); } };
export const users = {
	all() { return getJSON(LS.users, {}); },
	saveAll(obj) { setJSON(LS.users, obj); },
	upsert(username, user) {
		const all = getJSON(LS.users, {});
		all[username] = {
			name: user.name || username,
			avatar: user.avatar || '',
			...user
		};
		setJSON(LS.users, all);
	},
	get(username) { return this.all()[username]; }
};
export const data = { get(username) { return getJSON(LS.data(username), { settings: { theme: 'dark', volume: 0.8, name: username || 'Khách' }, library: [], playlists: {} }); }, set(username, d) { setJSON(LS.data(username), d); } };
export const demo = { async ensureDemo(username) { const d = data.get(username); if (d.library.length) return; const id = uid(); const track = { id, title: 'Âm 440Hz (Demo)', artist: 'FlowPlay', album: 'Sample', createdAt: Date.now(), sourceType: 'builtin', src: 'assets/demo/demo_440hz.wav' }; await idb.putTrack(track); d.library.push(id); data.set(username, d); } };

// Make available globally for discovery.js and other scripts
window.idb = idb;
window.data = data;
window.session = session;
window.users = users;
