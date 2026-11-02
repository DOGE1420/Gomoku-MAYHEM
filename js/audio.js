// 배경 음악: 메뉴·로비는 메뉴 곡, 게임은 판마다 두 곡 중 하나를 무작위로 골라 그 판 내내 반복 재생
// 설정 창의 음량 조절 (값은 이 기기에 저장)
// (index.html에서 순서대로 불러오는 일반 스크립트 — 파일끼리 전역 변수·함수를 함께 씀)
// 브라우저는 사용자가 화면을 누르기 전에는 소리를 못 내게 하므로, 첫 클릭·키 입력 때 재생을 시작함
const BGM_MENU = 'audio/bgm-menu.mp3';
const BGM_GAME = ['audio/bgm-keycard.mp3', 'audio/bgm-climax.mp3'];
const bgm = new Audio();
bgm.loop = true; // 곡이 끝나면 처음부터 다시
bgm.preload = 'none'; // 큰 파일이라 재생할 때 불러옴
let bgmTrack = BGM_MENU; // 지금 틀어야 할 곡
// 곡 바꾸기 (같은 곡이면 이어서 재생)
function setBgmTrack(src) {
  if (bgmTrack === src && bgm.getAttribute('src') === src) return;
  bgmTrack = src;
  bgm.setAttribute('src', src);
  bgm.currentTime = 0;
  if (bgmStarted && bgmEffectiveVolume() > 0) bgm.play().catch(() => {});
}
function bgmMenu() { setBgmTrack(BGM_MENU); }
// 새 판이 시작될 때마다 게임 곡 중 하나를 무작위로 (그 판이 끝날 때까지 그 곡만)
function bgmNewGame() {
  const src = BGM_GAME[Math.floor(Math.random() * BGM_GAME.length)];
  bgmTrack = null; // 같은 곡이 다시 뽑혀도 처음부터
  setBgmTrack(src);
}
const bgmVolumeInput = document.getElementById('bgm-volume');
const bgmVolumeValue = document.getElementById('bgm-volume-value');
const bgmMuteBtn = document.getElementById('bgm-mute');
let bgmVolume = 40, bgmMuted = false, bgmStarted = false;
try {
  const v = parseInt(localStorage.getItem('omok_bgm_volume'), 10);
  if (!isNaN(v) && v >= 0 && v <= 100) bgmVolume = v;
  bgmMuted = localStorage.getItem('omok_bgm_muted') === '1';
} catch (e) {}

function bgmEffectiveVolume() { return bgmMuted ? 0 : bgmVolume / 100; }
function applyBgmVolume() {
  const vol = bgmEffectiveVolume();
  bgm.volume = vol;
  bgmVolumeInput.value = String(bgmVolume);
  bgmVolumeValue.textContent = bgmVolume + '%';
  bgmMuteBtn.textContent = vol === 0 ? '🔇' : bgmVolume < 50 ? '🔉' : '🔊';
  bgmMuteBtn.setAttribute('aria-pressed', String(bgmMuted));
  if (vol === 0) bgm.pause();
  else if (bgmStarted && bgm.paused) bgm.play().catch(() => {});
}
function startBgm() {
  if (bgmStarted) return;
  bgmStarted = true;
  if (!bgm.getAttribute('src')) bgm.setAttribute('src', bgmTrack || BGM_MENU);
  if (bgmEffectiveVolume() > 0) bgm.play().catch(() => { bgmStarted = false; }); // 막히면 다음 입력 때 다시 시도
}
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, startBgm, true));
bgmVolumeInput.addEventListener('input', () => {
  bgmVolume = Math.max(0, Math.min(100, parseInt(bgmVolumeInput.value, 10) || 0));
  if (bgmVolume > 0) bgmMuted = false; // 슬라이더를 올리면 음소거 해제
  try { localStorage.setItem('omok_bgm_volume', String(bgmVolume)); localStorage.setItem('omok_bgm_muted', bgmMuted ? '1' : '0'); } catch (e) {}
  applyBgmVolume();
});
bgmMuteBtn.addEventListener('click', () => {
  bgmMuted = !bgmMuted;
  try { localStorage.setItem('omok_bgm_muted', bgmMuted ? '1' : '0'); } catch (e) {}
  applyBgmVolume();
});
applyBgmVolume();
