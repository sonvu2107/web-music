// scripts/auth-ui.js - Authentication UI for MongoDB
class AuthUI {
  constructor() {
    this.init();
  }

  init() {
    this.createAuthModal();
    this.bindEvents();
  }

  createAuthModal() {
    const modalHTML = `
      <div id="authModal" class="modal-overlay" style="display: none;">
        <div class="modal-content auth-modal">
          <div class="modal-header">
            <h3 id="authTitle">🎵 Đăng nhập FlowPlay</h3>
            <button class="close-btn" onclick="authUI.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Login Form -->
            <form id="loginForm" class="auth-form">
              <div class="form-group">
                <label for="loginUsername">Tên đăng nhập hoặc Email</label>
                <input type="text" id="loginUsername" required>
              </div>
              
              <div class="form-group">
                <label for="loginPassword">Mật khẩu</label>
                <input type="password" id="loginPassword" required>
              </div>
              
              <button type="submit" class="btn btn-primary" style="width: 100%;">Đăng nhập</button>
              
              <p class="auth-switch">
                Chưa có tài khoản? 
                <a href="#" onclick="authUI.switchToRegister()">Đăng ký ngay</a>
              </p>
            </form>

            <!-- Register Form -->
            <form id="registerForm" class="auth-form" style="display: none;">
              <div class="form-group">
                <label for="registerUsername">Tên đăng nhập *</label>
                <input type="text" id="registerUsername" required>
              </div>
              
              <div class="form-group">
                <label for="registerEmail">Email *</label>
                <input type="email" id="registerEmail" required>
              </div>
              
              <div class="form-group">
                <label for="registerDisplayName">Tên hiển thị</label>
                <input type="text" id="registerDisplayName">
              </div>
              
              <div class="form-group">
                <label for="registerPassword">Mật khẩu *</label>
                <input type="password" id="registerPassword" required minlength="6">
              </div>
              
              <div class="form-group">
                <label for="registerConfirmPassword">Xác nhận mật khẩu *</label>
                <input type="password" id="registerConfirmPassword" required minlength="6">
              </div>
              
              <button type="submit" class="btn btn-primary" style="width: 100%;">Tạo tài khoản</button>
              
              <p class="auth-switch">
                Đã có tài khoản? 
                <a href="#" onclick="authUI.switchToLogin()">Đăng nhập</a>
              </p>
            </form>

            <!-- Loading State -->
            <div id="authLoading" class="loading-state" style="display: none;">
              <div class="loading-spinner"></div>
              <p>Đang xử lý...</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  bindEvents() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegister();
    });

    // Note: Removed auto-show modal - users can manually click login button
  }

  showModal() {
    document.getElementById('authModal').style.display = 'flex';
  }

  closeModal() {
    document.getElementById('authModal').style.display = 'none';
  }

  switchToLogin() {
    document.getElementById('authTitle').textContent = '🎵 Đăng nhập FlowPlay';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  }

  switchToRegister() {
    document.getElementById('authTitle').textContent = '🎵 Đăng ký FlowPlay';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
  }

  async handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
      this.showNotification('Vui lòng nhập đầy đủ thông tin', 'error');
      return;
    }

    try {
      this.showLoading(true);
      
      const response = await window.apiClient.login({ username, password });
      
      this.showNotification('Đăng nhập thành công!', 'success');
      this.closeModal();
      
      // Update UI
      this.updateUIAfterLogin(response.user);
      
      // Refresh library to show MongoDB tracks
      if (window.currentUI && window.currentUI.renderLibrary) {
        setTimeout(() => window.currentUI.renderLibrary(), 100);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      this.showNotification(error.message || 'Đăng nhập thất bại', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async handleRegister() {
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const displayName = document.getElementById('registerDisplayName').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    // Validation
    if (!username || !email || !password) {
      this.showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
      return;
    }

    if (password.length < 6) {
      this.showNotification('Mật khẩu phải có ít nhất 6 ký tự', 'error');
      return;
    }

    if (password !== confirmPassword) {
      this.showNotification('Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showNotification('Email không hợp lệ', 'error');
      return;
    }

    try {
      this.showLoading(true);
      
      const response = await window.apiClient.register({
        username,
        email,
        password,
        displayName: displayName || username
      });
      
      this.showNotification('Đăng ký thành công!', 'success');
      this.closeModal();
      
      // Update UI
      this.updateUIAfterLogin(response.user);
      
      // Refresh library to show MongoDB tracks
      if (window.currentUI && window.currentUI.renderLibrary) {
        setTimeout(() => window.currentUI.renderLibrary(), 100);
      }
      
    } catch (error) {
      console.error('Register error:', error);
      this.showNotification(error.message || 'Đăng ký thất bại', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  updateUIAfterLogin(user) {
    // Update avatar
    const avatar = document.getElementById('avatar');
    if (avatar) {
      if (user.avatar) {
        // Set background image for avatar
        avatar.style.backgroundImage = `url(${user.avatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.textContent = '';
      } else {
        // Fallback to initials
        avatar.textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase();
        avatar.style.backgroundImage = 'none';
      }
      avatar.title = user.displayName || user.username;
    }

    // Update hello text
    const helloName = document.getElementById('hello-name');
    if (helloName) {
      helloName.textContent = user.displayName || user.username;
    }

    // Hide login button, show MongoDB features
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) loginBtn.style.display = 'none';
    
    document.querySelectorAll('#btn-upload-db, #btn-library-db, #btn-profile, #btn-logout').forEach(btn => {
      btn.style.display = 'block';
    });

    // Trigger login event
    window.dispatchEvent(new CustomEvent('userLogin', { detail: user }));
  }

  showLoading(show) {
    const loading = document.getElementById('authLoading');
    const forms = document.querySelectorAll('.auth-form');
    
    if (show) {
      loading.style.display = 'block';
      forms.forEach(form => form.style.display = 'none');
    } else {
      loading.style.display = 'none';
      // Show appropriate form
      const isLogin = document.getElementById('authTitle').textContent.includes('Đăng nhập');
      document.getElementById(isLogin ? 'loginForm' : 'registerForm').style.display = 'block';
    }
  }

  showNotification(message, type = 'info') {
    // Use existing notification system
    if (window.mongoUI) {
      window.mongoUI.showNotification(message, type);
    } else {
      alert(message); // Fallback
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Check if user is logged in
  isLoggedIn() {
    return window.apiClient && window.apiClient.token;
  }

  // Handle logout
  handleLogout() {
    window.apiClient.logout();
    this.showNotification('Đã đăng xuất thành công', 'success');
    
    // Reset UI
    const avatar = document.getElementById('avatar');
    if (avatar) {
      avatar.textContent = '?';
      avatar.title = '';
    }

    const helloName = document.getElementById('hello-name');
    if (helloName) {
      helloName.textContent = 'bạn.';
    }

    // Show login button, hide MongoDB features
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) loginBtn.style.display = 'block';
    
    document.querySelectorAll('#btn-upload-db, #btn-library-db, #btn-profile, #btn-logout').forEach(btn => {
      btn.style.display = 'none';
    });
    
    // Refresh library to hide MongoDB tracks
    if (window.currentUI && window.currentUI.renderLibrary) {
      setTimeout(() => window.currentUI.renderLibrary(), 100);
    }
  }
}

// Initialize Auth UI
window.authUI = new AuthUI();
