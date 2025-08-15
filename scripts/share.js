// share.js - Chia sẻ playlist, bài hát, thư viện
export function showShareModal(link) {
  const modal = document.getElementById('share-modal');
  document.getElementById('share-link').textContent = link;
  modal.classList.add('show');
  document.getElementById('btn-copy-share-link').onclick = () => {
    navigator.clipboard.writeText(link);
    alert('Đã sao chép link!');
  };
  document.getElementById('btn-close-share').onclick = () => modal.classList.remove('show');
}
