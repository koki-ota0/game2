import { soundEngine } from './sound.js';

export class GameRecorder {
  constructor(appContainer) {
    this.appContainer = appContainer;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordBtn = null;
    this.statusBadge = null;
  }

  mountUI() {
    // Floating Quick Record Action button on UI
    const container = document.createElement('div');
    container.id = 'demo-recorder-controls';
    container.style.cssText = `
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    container.innerHTML = `
      <div id="rec-status-badge" style="display: none; background: rgba(239, 68, 68, 0.9); color: white; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 12px; animation: pulse 1s infinite; letter-spacing: 0.5px;">● REC 00:00</div>
      <button id="btn-toggle-record" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(244, 63, 94, 0.6); color: #f43f5e; padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer; backdrop-filter: blur(8px); display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        <span>🎥</span>
        <span id="rec-btn-text">デモ動画録画</span>
      </button>
      <select id="select-rec-angle" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(147, 197, 253, 0.3); color: #93c5fd; font-size: 10px; padding: 5px 8px; border-radius: 10px; outline: none;">
        <option value="portrait">📱 スマホ縦 (SNS用)</option>
        <option value="cinematic">🎬 シネマティック (ズーム)</option>
        <option value="wide">💻 ワイド俯瞰 (開発記録)</option>
      </select>
    `;

    document.getElementById('app-container').appendChild(container);

    this.recordBtn = document.getElementById('btn-toggle-record');
    this.statusBadge = document.getElementById('rec-status-badge');
    const angleSelect = document.getElementById('select-rec-angle');

    angleSelect.addEventListener('change', (e) => {
      this.applyCameraAngle(e.target.value);
    });

    this.recordBtn.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording(angleSelect.value);
      }
    });
  }

  applyCameraAngle(angle) {
    const main = document.getElementById('main-content');
    if (!main) return;
    if (angle === 'cinematic') {
      main.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      main.style.transform = 'scale(1.08) translateY(-10px)';
    } else if (angle === 'wide') {
      main.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      main.style.transform = 'scale(0.95)';
    } else {
      main.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      main.style.transform = 'scale(1)';
    }
  }

  async startRecording(angle = 'portrait') {
    try {
      this.applyCameraAngle(angle);

      // Create stream from the ambient visualizer canvas + combined canvas if supported
      const ambientCanvas = document.getElementById('ambient-canvas');
      let stream = null;

      if (ambientCanvas && ambientCanvas.captureStream) {
        stream = ambientCanvas.captureStream(30);
      } else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      }

      if (!stream) {
        alert('動画キャプチャ機能の準備ができました。録画開始します。');
      }

      this.recordedChunks = [];
      let options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }

      if (stream) {
        this.mediaRecorder = new MediaRecorder(stream, options);
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          this.saveRecordingBlob();
        };

        this.mediaRecorder.start(100);
      }

      this.isRecording = true;
      this.statusBadge.style.display = 'block';
      this.recordBtn.querySelector('#rec-btn-text').textContent = '録画停止・保存';
      this.recordBtn.style.background = 'rgba(239, 68, 68, 0.3)';

      let seconds = 0;
      this.timerInterval = setInterval(() => {
        seconds++;
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        this.statusBadge.textContent = `● REC ${mins}:${secs} [${angle}]`;
      }, 1000);

    } catch (err) {
      console.warn('Screen recording info:', err);
    }
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    clearInterval(this.timerInterval);

    this.statusBadge.style.display = 'none';
    this.recordBtn.querySelector('#rec-btn-text').textContent = 'デモ動画録画';
    this.recordBtn.style.background = 'rgba(15, 23, 42, 0.85)';
    this.applyCameraAngle('portrait');

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      alert('動画をクリップとして処理しました。');
    }
  }

  saveRecordingBlob() {
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `ephemere-gameplay-${timestamp}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}
