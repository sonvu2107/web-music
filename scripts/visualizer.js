
export function createVisualizer(audioEl, canvas) {
  const ctx = canvas.getContext('2d');
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  
  let ac = null;
  let src = null;
  let analyser = null;
  let bufferLength = 0;
  let dataArray = null;
  let isInitialized = false;
  
  function initAudioContext() {
    if (isInitialized) return;
    
    try {
      ac = new AudioCtx();
      src = ac.createMediaElementSource(audioEl);
      analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      src.connect(analyser); 
      analyser.connect(ac.destination);
      isInitialized = true;
    } catch (error) {
      console.warn('AudioContext initialization failed:', error);
    }
  }
  
  // Initialize on first play
  audioEl.addEventListener('play', initAudioContext, { once: true });
  
  function draw() {
    requestAnimationFrame(draw);
    
    if (!isInitialized || !analyser) {
      // Just draw empty bars if not initialized
      const w = canvas.width = canvas.clientWidth;
      const h = canvas.height = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      return;
    }
    
    analyser.getByteFrequencyData(dataArray);
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;
    const barWidth = (w / bufferLength) * 1.75;
    let x = 0; ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 255;
      const y = v * h;
      ctx.fillStyle = `rgba(${120 + 135 * v | 0}, ${92 + 80 * v | 0}, ${255 - 80 * v | 0}, ${.6 + .4 * v})`;
      ctx.fillRect(x, h - y, barWidth - 2, y); x += barWidth;
    }
  }
  draw();
  const resume = () => ac && ac.state === 'suspended' && ac.resume();
  document.addEventListener('click', resume, { once: true });
  document.addEventListener('keydown', resume, { once: true });
  return { ac, analyser };
}
