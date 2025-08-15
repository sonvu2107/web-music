
import { $, $$, toast } from './utils.js';
import { session, data, demo } from './storage.js';
import { Player } from './player.js';
import { createVisualizer } from './visualizer.js';
import { PlaylistsUI } from './playlists.js';
import { UI } from './ui.js';

const player = Player(); 
const playlists = PlaylistsUI(player); 
const ui = UI(player, playlists);
window.currentUI = ui;
window.player = player; // Make player available globally

async function onLoggedIn(username) {
  // Set global current user for other scripts
  window.currentUser = username;
  
  player.setUser(username); 
  playlists.setUser(username); 
  ui.setUser(username);
  await demo.ensureDemo(username); 
  ui.renderLibrary();
  
  const d = data.get(username); 
  document.documentElement.setAttribute('data-theme', d.settings.theme || 'dark');
  document.getElementById('volume').value = d.settings.volume ?? 0.8;
  document.getElementById('audio').volume = parseFloat(document.getElementById('volume').value);
  document.getElementById('hello-name').textContent = d.settings.name || username;
  
  // Logout for local storage system (fallback)
  document.getElementById('btn-logout').onclick = () => { 
    // Handle both MongoDB logout and local storage
    if (window.authUI) {
      window.authUI.handleLogout();
    } else {
      localStorage.removeItem('flowplay.session'); 
      location.reload();
    }
  };
  
  createVisualizer(document.getElementById('audio'), document.getElementById('viz'));
  
  $$('.nav-btn').forEach(btn => { 
    btn.addEventListener('click', () => { 
      $$('.nav-btn').forEach(b => b.classList.remove('active')); 
      btn.classList.add('active'); 
      const r = btn.dataset.route;
      ['home', 'library', 'playlists', 'settings'].forEach(name => 
        document.getElementById('view-' + name).hidden = (name !== r)
      ); 
    }); 
  });
}

function init() { 
  // Check local storage session (for backward compatibility)
  const s = session.current(); 
  if (s?.username) { 
    onLoggedIn(s.username); 
  } else {
    // No auto-login modal anymore - user can choose to login via MongoDB
    // Just initialize with guest mode for local features
    onLoggedIn('guest');
  }
}

init();
