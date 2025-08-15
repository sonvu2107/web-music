
import { $, $$, toast, formatTime, uid } from './utils.js';
import { idb, data } from './storage.js';
import { showOnlineSearchModal } from './online-search.js';
import { showHistoryModal } from './history.js';
import { showSleepTimerModal } from './sleep-timer.js';
export function UI(player, playlists) {
  const routes = ['home', 'library', 'playlists', 'settings']; const view = (r) => $(`#view-${r}`);
  const navBtns = $$('.nav-btn'); const libTable = $('#lib-table tbody'); const libCount = $('#lib-count'); const dropZone = $('#drop-zone'); const avatar = $('#avatar'); const helloName = $('#hello-name');
  let user = null;
  function setUser(u) { user = u; const d = data.get(user); avatar.textContent = (d.settings.name || user || 'K').slice(0, 1).toUpperCase(); helloName.textContent = d.settings.name || user; renderLibrary(); playlists.renderCards(); }
  function navigate(r) { routes.forEach(name => { const v = view(name); v.hidden = name !== r; }); navBtns.forEach(b => b.classList.toggle('active', b.dataset.route === r)); }
  function bindNav() { navBtns.forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.route))); }
  async function renderLibrary() {
    const d = data.get(user); 
    const localTracks = [];
    
    // Get local tracks
    for (const id of d.library) { 
      const t = await idb.getTrack(id); 
      if (t) localTracks.push({...t, source: 'local'}); 
    }
    
    // Get MongoDB tracks if logged in
    let mongoTracks = [];
    if (window.authUI && window.authUI.isLoggedIn() && window.apiClient) {
      try {
        const response = await window.apiClient.getUserTracks();
        mongoTracks = response.tracks.map(track => ({
          ...track,
          source: 'mongodb'
        }));
      } catch (error) {
        console.log('No MongoDB tracks or not connected:', error);
      }
    }
    
    // Combine tracks
    const allTracks = [...localTracks, ...mongoTracks];
    
    libTable.innerHTML = ''; 
    allTracks.forEach((t, i) => {
      const tr = document.createElement('tr'); 
      const sourceIcon = t.source === 'mongodb' ? '☁️' : '💾';
      tr.innerHTML = `<td>${i + 1}</td><td>${t.title} ${sourceIcon}</td><td class="muted">${t.artist || '—'}</td><td class="muted">${t.duration ? formatTime(t.duration) : '—'}</td><td class="actions"><button class="icon-btn sm"><img src="assets/icons/play.svg" width="18"/></button><button class="icon-btn sm"><img src="assets/icons/add.svg" width="18"/></button><button class="icon-btn sm"><img src="assets/icons/delete.svg" width="18"/></button></td>`; 
      const [playBtn, addBtn, delBtn] = tr.querySelectorAll('button'); 
      
      playBtn.onclick = () => {
        if (t.source === 'mongodb') {
          window.mongoUI.playTrack(t.id || t._id);
        } else {
          player.playTracksByIds(user, d.library, localTracks.indexOf(t));
        }
      };
      
      addBtn.onclick = async () => { 
        const name = prompt('Thêm vào playlist tên:'); 
        if (!name) return; 
        const dd = data.get(user); 
        let pl = Object.values(dd.playlists).find(p => p.name.toLowerCase() === name.toLowerCase()); 
        if (!pl) { 
          const id = crypto.randomUUID ? crypto.randomUUID() : 'pl-' + Math.random().toString(36).slice(2); 
          dd.playlists[id] = { id, name, trackIds: [], createdAt: Date.now() }; 
        } 
        const pid = Object.values(dd.playlists).find(p => p.name.toLowerCase() === name.toLowerCase()).id; 
        dd.playlists[pid].trackIds.push(t.id); 
        data.set(user, dd); 
        playlists.renderCards(); 
        toast('Đã thêm vào playlist'); 
      };
      
      delBtn.onclick = async () => { 
        if (t.source === 'mongodb') {
          if (confirm('Xóa nhạc này khỏi MongoDB?')) {
            try {
              await window.apiClient.deleteTrack(t.id || t._id);
              toast('Đã xóa nhạc khỏi MongoDB');
              renderLibrary();
            } catch (error) {
              toast('Lỗi khi xóa nhạc: ' + error.message);
            }
          }
        } else {
          const dd = data.get(user); 
          dd.library = dd.library.filter(x => x !== t.id); 
          data.set(user, dd); 
          await idb.deleteTrack(t.id); 
          renderLibrary(); 
          toast('Đã xoá bài khỏi thư viện'); 
        }
      };
      
      libTable.appendChild(tr);
    }); 
    libCount.textContent = allTracks.length;
  }
  function bindLibraryAdding() {
    const fileInput = $('#file-input'); 
    $('#btn-add-tracks').onclick = () => handleAddTracks();
    $('#btn-upload').onclick = () => handleAddTracks();
    
    fileInput.addEventListener('change', async (e) => { const files = Array.from(e.target.files || []); await addFiles(files); e.target.value = ''; });
    const prevent = e => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => document.addEventListener(ev, prevent));
    document.addEventListener('dragover', () => dropZone.style.outline = '2px dashed rgba(124,92,255,.6)');
    document.addEventListener('dragleave', () => dropZone.style.outline = '1px dashed rgba(124,92,255,.35)');
    document.addEventListener('drop', async (e) => { dropZone.style.outline = '1px dashed rgba(124,92,255,.35)'; const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('audio/')); if (files.length) { await addFiles(files); } });
  }
  
  function handleAddTracks() {
    // Check if user is logged into MongoDB
    if (window.authUI && window.authUI.isLoggedIn && window.authUI.isLoggedIn()) {
      // Show MongoDB upload modal
      if (window.mongoUI) {
        window.mongoUI.showModal('uploadModal');
      } else {
        // Fallback to local file input
        $('#file-input').click();
      }
    } else {
      // Use local file input for guest users
      $('#file-input').click();
    }
  }
  async function addFiles(files) { const d = data.get(user); let added = 0; for (const f of files) { const id = crypto.randomUUID ? crypto.randomUUID() : 't-' + Math.random().toString(36).slice(2); const title = f.name.replace(/\.[^/.]+$/, '').slice(0, 80); const track = { id, title, artist: 'Không xác định', album: '', createdAt: Date.now(), sourceType: 'file' }; await idb.putTrack(track); await idb.putBlob(id, f); d.library.push(id); added++; try { const url = URL.createObjectURL(f); await new Promise((resolve) => { const a = new Audio(); a.src = url; a.addEventListener('loadedmetadata', () => { track.duration = a.duration; idb.putTrack(track); URL.revokeObjectURL(url); resolve(); }); }); } catch { } } data.set(user, d); toast(`Đã thêm ${added} bài`); renderLibrary(); }
  function bindSearch() { const input = $('#search-input'); input.addEventListener('input', async () => { const q = input.value.toLowerCase(); const d = data.get(user); const rows = Array.from(libTable.querySelectorAll('tr')); const ids = d.library; for (let i = 0; i < ids.length; i++) { const t = await idb.getTrack(ids[i]); const text = `${t.title} ${t.artist} ${t.album}`.toLowerCase(); const show = text.includes(q); rows[i].style.display = show ? '' : 'none'; } }); }
  function bindTheme() { const toggle = $('#theme-toggle'); const btnTheme = $('#btn-theme'); const updateIcon = () => { const isLight = document.documentElement.getAttribute('data-theme') === 'light'; toggle.querySelector('img').src = isLight ? 'assets/icons/moon.svg' : 'assets/icons/sun.svg'; }; const switchTheme = () => { const cur = document.documentElement.getAttribute('data-theme') || 'dark'; const next = cur === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); const d = data.get(user); d.settings.theme = next; data.set(user, d); updateIcon(); }; toggle.onclick = switchTheme; if (btnTheme) btnTheme.onclick = switchTheme; updateIcon(); }
  function bindSettings() { const btn = $('#btn-change-name'); if (btn) btn.onclick = () => { const d = data.get(user); const name = prompt('Tên hiển thị:', d.settings.name || user); if (!name) return; d.settings.name = name; data.set(user, d); setUser(user); toast('Đã cập nhật tên.'); }; }
  function bindHome() { const btn = $('#add-demo'); if (btn) btn.onclick = async () => { const lib = data.get(user).library; let t = null; if (lib.length) { t = await idb.getTrack(lib[0]); } if (!t) { const id = crypto.randomUUID ? crypto.randomUUID() : 'd-' + Math.random().toString(36).slice(2); const track = { id, title: 'Âm 440Hz (Demo)', artist: 'FlowPlay', sourceType: 'builtin', src: 'assets/demo/demo_440hz.wav', createdAt: Date.now() }; await idb.putTrack(track); const d = data.get(user); d.library.push(id); data.set(user, d); player.addAndPlayTrack(track); } else { player.addAndPlayTrack(t); } }; }
  
  function bindAdvancedFeatures() {
    const btnOnlineSearch = $('#btn-online-search');
    const btnHistory = $('#btn-history');
    const btnSleepTimer = $('#btn-sleep-timer');
    
    if (btnOnlineSearch) btnOnlineSearch.onclick = () => showOnlineSearchModal(user);
    if (btnHistory) btnHistory.onclick = () => showHistoryModal();
    if (btnSleepTimer) btnSleepTimer.onclick = () => showSleepTimerModal(document.getElementById('audio'));
  }
  
  // Expose UI globally for library refresh
  const uiInstance = { setUser, navigate, renderLibrary };
  window.currentUI = uiInstance;
  
  bindNav(); bindLibraryAdding(); bindSearch(); bindTheme(); bindSettings(); bindHome(); bindAdvancedFeatures();
  return uiInstance;
}
