// ==============================================
//  AUDIO UTILITIES
// ==============================================

const audioCache = {};

export function playTone(id, vol = 0.7) {
  try {
    const tones = {
      success: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
      error: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
      notification: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
      click: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
      bell: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
      welcome: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
      scissors: "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==",
    };

    const audioUrl = tones[id];
    if (!audioUrl) return;

    let audio = audioCache[id];
    if (!audio) {
      audio = new Audio(audioUrl);
      audioCache[id] = audio;
    }

    audio.volume = Math.min(1, Math.max(0, vol));
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (err) {
    console.warn("Audio play failed:", err);
  }
}

export function playSuccessSound() {
  playTone("success", 0.7);
}

export function playErrorSound() {
  playTone("error", 0.7);
}

export function playNotificationSound() {
  playTone("notification", 0.6);
}

export function playClickSound() {
  playTone("click", 0.5);
}
