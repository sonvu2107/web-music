// sleep-timer.js - Hẹn giờ tắt nhạc
import { toast } from './utils.js';

let timer = null;
let remainingTime = 0;
let countdownInterval = null;

export function showSleepTimerModal(audio) {
  const modal = document.getElementById('sleep-timer-modal');
  const status = document.getElementById('sleep-timer-status');
  const minutesInput = document.getElementById('sleep-minutes');
  const setBtn = document.getElementById('btn-set-sleep');
  const cancelBtn = document.getElementById('btn-cancel-sleep');
  
  modal.classList.add('show');
  
  // Cập nhật trạng thái hiện tại
  updateStatus();
  
  setBtn.onclick = () => {
    const mins = parseInt(minutesInput.value);
    if (!mins || mins < 1 || mins > 180) {
      return alert('Nhập số phút từ 1-180!');
    }
    
    // Hủy timer cũ nếu có
    if (timer) clearTimeout(timer);
    if (countdownInterval) clearInterval(countdownInterval);
    
    remainingTime = mins * 60; // Convert to seconds
    
    // Tạo timer mới
    timer = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      status.textContent = '⏰ Đã tắt nhạc tự động';
      toast('Hẹn giờ tắt nhạc đã kích hoạt');
      timer = null;
      remainingTime = 0;
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }, mins * 60000);
    
    // Countdown hiển thị
    countdownInterval = setInterval(() => {
      remainingTime--;
      updateStatus();
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }, 1000);
    
    toast(`Sẽ tắt nhạc sau ${mins} phút`);
    minutesInput.value = '';
  };
  
  cancelBtn.onclick = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    remainingTime = 0;
    status.textContent = '';
    modal.classList.remove('show');
    toast('Đã hủy hẹn giờ tắt');
  };
  
  // Enter key để set timer
  minutesInput.onkeypress = (e) => {
    if (e.key === 'Enter') setBtn.click();
  };
  
  function updateStatus() {
    if (remainingTime > 0) {
      const mins = Math.floor(remainingTime / 60);
      const secs = remainingTime % 60;
      status.textContent = `⏱️ Sẽ tắt nhạc sau ${mins}:${secs.toString().padStart(2, '0')}`;
      setBtn.textContent = 'Đặt lại';
    } else if (timer) {
      status.textContent = '⏰ Hẹn giờ đang hoạt động';
      setBtn.textContent = 'Đặt lại';
    } else {
      status.textContent = '';
      setBtn.textContent = 'Bắt đầu';
    }
  }
}
