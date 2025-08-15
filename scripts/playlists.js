
import { $, $$, uid, toast, confirmDialog, formatTime } from './utils.js';
import { idb, data } from './storage.js';
export function PlaylistsUI(player) {
  const cardsC = $('#playlist-cards'); const detail = $('#playlist-detail'); const plTitle = $('#pl-title'); const plCount = $('#pl-count'); const plTableBody = $('#pl-table tbody'); const playAllBtn = $('#pl-play-all'); const deleteBtn = $('#pl-delete');
  let user = null; let currentId = null;
  function setUser(u) { user = u; } function getData() { return data.get(user); } function saveData(d) { data.set(user, d); }
  function renderCards() { const d = getData(); cardsC.innerHTML = ''; const ids = Object.keys(d.playlists); if (!ids.length) { cardsC.innerHTML = `<div class="card"><div class="cover">🎶</div><div class="meta"><div><div class="title">Chưa có playlist</div><div class="muted">Tạo một playlist mới nhé!</div></div></div></div>`; return; } ids.forEach(id => { const pl = d.playlists[id]; const card = document.createElement('div'); card.className = 'card'; card.innerHTML = `<div class="cover">${pl.name.slice(0, 2).toUpperCase()}</div><div class="meta"><div><div class="title">${pl.name}</div><div class="muted">${pl.trackIds.length} bài</div></div><button class="btn secondary" data-id="${pl.id}">Mở</button></div>`; cardsC.appendChild(card); card.querySelector('button').onclick = () => openDetail(pl.id); }); }
  async function openDetail(id) {
    const d = getData(); const pl = d.playlists[id]; if (!pl) return; currentId = id; plTitle.textContent = pl.name; plCount.textContent = `${pl.trackIds.length} bài hát`; detail.hidden = false; plTableBody.innerHTML = ''; let idx = 0; for (const tid of pl.trackIds) {
      const tr = await idb.getTrack(tid); if (!tr) continue; const row = document.createElement('tr'); row.draggable = true; row.dataset.id = tid; row.innerHTML = `<td>${++idx}</td><td>${tr.title}</td><td class="muted">${tr.artist || '—'}</td><td class="muted">${tr.duration ? formatTime(tr.duration) : '—'}</td><td class="actions"><button class="icon-btn sm remove" title="Xoá khỏi playlist"><img src="assets/icons/delete.svg" width="18" height="18"/></button></td>`; row.querySelector('.remove').onclick = () => removeFromCurrent(tid);
      row.addEventListener('dragstart', (e) => { row.classList.add('dragging'); e.dataTransfer.setData('text/plain', tid); });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => { e.preventDefault(); const dragging = plTableBody.querySelector('.dragging'); const rows = Array.from(plTableBody.querySelectorAll('tr')); const after = rows.find(r => e.clientY <= r.getBoundingClientRect().y + r.getBoundingClientRect().height / 2); if (after == null) plTableBody.appendChild(dragging); else plTableBody.insertBefore(dragging, after); });
      plTableBody.appendChild(row);
    }
  }
  async function removeFromCurrent(tid) { const d = getData(); const pl = d.playlists[currentId]; if (!pl) return; pl.trackIds = pl.trackIds.filter(x => x !== tid); saveData(d); openDetail(currentId); toast('Đã xoá khỏi playlist'); }
  function bindDetailActions() {
    playAllBtn.onclick = async () => { const d = getData(); const pl = d.playlists[currentId]; if (!pl) return; player.playTracksByIds(user, pl.trackIds, 0); }; deleteBtn.onclick = async () => { if (!(await confirmDialog('Xoá playlist này?'))) return; const d = getData(); delete d.playlists[currentId]; saveData(d); detail.hidden = true; renderCards(); toast('Đã xoá playlist'); };
    plTableBody.addEventListener('drop', () => { const ids = Array.from(plTableBody.querySelectorAll('tr')).map(tr => tr.dataset.id); const d = getData(); d.playlists[currentId].trackIds = ids; saveData(d); openDetail(currentId); });
  }
  async function addTracksToPlaylist(plId, trackIds) { const d = getData(); const pl = d.playlists[plId]; if (!pl) return; pl.trackIds.push(...trackIds); saveData(d); toast(`Đã thêm ${trackIds.length} bài vào ${pl.name}`); }
  function createPlaylist(name = 'Playlist mới') { const d = getData(); const id = uid(); d.playlists[id] = { id, name, trackIds: [], createdAt: Date.now() }; saveData(d); renderCards(); return id; }
  function bindGlobalButtons() { $('#btn-create-playlist').onclick = () => { const name = prompt('Tên playlist:', 'Playlist của tôi'); if (!name) return; const id = createPlaylist(name); openDetail(id); }; $('#btn-new-playlist').onclick = () => $('#btn-create-playlist').click(); }
  bindDetailActions(); bindGlobalButtons();
  return { setUser, renderCards, openDetail, createPlaylist, addTracksToPlaylist };
}
