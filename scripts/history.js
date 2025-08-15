// history.js - Lịch sử nghe nhạc, gợi ý thông minh
import { data } from './storage.js';
import { formatTime } from './utils.js';

export function showHistoryModal() {
  const modal = document.getElementById('history-modal');
  const historyList = document.getElementById('history-list');
  const closeBtn = document.getElementById('btn-close-history');

  modal.classList.add('show');

  closeBtn.onclick = () => {
    modal.classList.remove('show');
  };

  // Lấy lịch sử từ localStorage hoặc tạo dữ liệu mẫu
  const getHistory = () => {
    const stored = localStorage.getItem('flowplay.listening-history');
    if (stored) return JSON.parse(stored);

    // Tạo dữ liệu lịch sử mẫu
    return [
      { title: 'Âm 440Hz (Demo)', artist: 'FlowPlay', playedAt: Date.now() - 3600000, playCount: 5 },
      { title: 'Last Song', artist: 'Unknown Artist', playedAt: Date.now() - 7200000, playCount: 3 },
      { title: 'Previous Track', artist: 'Demo Artist', playedAt: Date.now() - 10800000, playCount: 2 }
    ];
  };

  const history = getHistory();

  if (history.length === 0) {
    historyList.innerHTML = '<p style="text-align:center; color:var(--muted); padding:20px;">Chưa có lịch sử nghe nhạc</p>';
  } else {
    historyList.innerHTML = `
      <div style="margin-bottom:16px;">
        <h3 style="margin-bottom:8px;">Gần đây</h3>
        ${history.map(item => `
          <div style="padding:8px; border:1px solid var(--bg-soft); border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:600;">${item.title}</div>
              <div style="color:var(--muted); font-size:13px;">
                ${item.artist} • Phát ${item.playCount} lần • ${getTimeAgo(item.playedAt)}
              </div>
            </div>
            <button class="btn secondary" onclick="replayFromHistory('${item.title}')">Phát lại</button>
          </div>
        `).join('')}
      </div>
      <div>
        <h3 style="margin-bottom:8px;">Gợi ý cho bạn</h3>
        <p style="color:var(--muted); font-size:13px;">Dựa trên lịch sử nghe, chúng tôi nghĩ bạn sẽ thích:</p>
        <div style="padding:8px; border:1px solid var(--brand); border-radius:8px; margin-top:8px;">
          <div style="font-weight:600;">Nhạc thư giãn - 440Hz Healing</div>
          <div style="color:var(--muted); font-size:13px;">Tương tự Âm 440Hz (Demo) mà bạn đã nghe</div>
        </div>
      </div>
    `;
  }

  // Global function để phát lại từ lịch sử
  window.replayFromHistory = (title) => {
    closeBtn.click();
    // Trong thực tế sẽ tìm và phát track này
    import('./utils.js').then(({ toast }) => {
      toast(`Đang phát "${title}"`);
    });
  };
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  return 'Vừa xong';
}
