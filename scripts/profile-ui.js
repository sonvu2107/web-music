// scripts/profile-ui.js - Xử lý giao diện chỉnh sửa profile
import { profile } from './profile.js';
import { session, users } from './storage.js';

function showProfileModal() {
  const modal = document.getElementById('profile-modal');
  const avaPreview = document.getElementById('profile-ava-preview');
  const nameInput = document.getElementById('profile-name');
  const user = profile.getCurrent();
  avaPreview.src = user.avatar || '';
  nameInput.value = user.name || '';
  modal.classList.add('show');
}

function hideProfileModal() {
  document.getElementById('profile-modal').classList.remove('show');
  // Xóa input mật khẩu khi đóng
  document.getElementById('profile-oldpass').value = '';
  document.getElementById('profile-newpass').value = '';
}

function bindProfileUI() {
  const editBtn = document.getElementById('btn-edit-profile');
  const cancelBtn = document.getElementById('btn-cancel-profile');
  const uploadBtn = document.getElementById('btn-upload-ava');
  const avaInput = document.getElementById('profile-ava-input');
  
  if (editBtn) editBtn.onclick = showProfileModal;
  if (cancelBtn) cancelBtn.onclick = hideProfileModal;
  if (uploadBtn) {
    uploadBtn.onclick = () => {
      if (avaInput) avaInput.click();
    };
  }
  if (avaInput) {
    avaInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('profile-ava-preview').src = ev.target.result;
        document.getElementById('profile-ava-preview').dataset.newava = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
  }
  
  const saveBtn = document.getElementById('btn-save-profile');
  if (saveBtn) {
    saveBtn.onclick = async () => {
    const name = document.getElementById('profile-name').value.trim();
    const newAva = document.getElementById('profile-ava-preview').dataset.newava;
    const oldPass = document.getElementById('profile-oldpass').value;
    const newPass = document.getElementById('profile-newpass').value;
    try {
      if (name || newAva) profile.updateProfile({ name, avatar: newAva });
      if (oldPass && newPass) await profile.changePassword(oldPass, newPass);

      const avatarEl = document.getElementById('avatar');
      if (newAva) {
        avatarEl.innerHTML = `<img src="${newAva}" alt="avatar" style="width:100%;height:100%;border-radius:12px;object-fit:cover;">`;
      } else if (name) {
        avatarEl.textContent = name.slice(0,1).toUpperCase();
      }
      alert('Đã lưu hồ sơ!');
      hideProfileModal();
      location.reload();
    } catch (e) {
      alert(e.message);
    }
  };
  }
}

function syncAvatar() {
  const avatarEl = document.getElementById('avatar');
  const user = profile.getCurrent();
  if (user?.avatar) {
    avatarEl.innerHTML = `<img src="${user.avatar}" alt="avatar" style="width:100%;height:100%;border-radius:12px;object-fit:cover;">`;
  } else if (user?.name) {
    avatarEl.textContent = user.name.slice(0,1).toUpperCase();
  }
}
bindProfileUI();
syncAvatar();
