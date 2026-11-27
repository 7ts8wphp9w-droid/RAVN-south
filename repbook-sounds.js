const repbookSounds = (() => {
  const postingAsset = './assets/repbook-post-chime.wav?v=focus-pulse';
  // A short, silent recording lets Safari authorize the player inside the tap.
  const silentClip = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
  const useNativePlayer = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const buffers = new Map();
  let postingPlayer;
  let nativeReady;
  let context;
  let activeChimes = 0;
  let previousSessionType;

  function withPlaybackAudio(source) {
    const session = navigator.audioSession;
    if (!session) return () => source.disconnect();

    if (!activeChimes) {
      previousSessionType = session.type;
      try {
        // iOS can mute notification-style Web Audio while in Silent Mode.
        session.type = 'playback';
      } catch {
        // Continue with the browser's default audio session.
      }
    }
    activeChimes++;
    return () => {
      source.disconnect();
      activeChimes--;
      if (!activeChimes && session.type === 'playback') {
        session.type = previousSessionType;
      }
    };
  }

  function prepare(asset) {
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) return;
      context ||= new AudioEngine();
      // Unlock the audio output in the user gesture, before saving to the server.
      const needsUnlock = context.state !== 'running';
      const resumed = context.resume().then(() => true, () => false);
      if (needsUnlock) {
        const silence = context.createBufferSource();
        silence.buffer = context.createBuffer(1, 1, context.sampleRate);
        silence.connect(context.destination);
        silence.onended = () => silence.disconnect();
        silence.start();
      }
      if (!buffers.has(asset)) {
        const buffer = fetch(asset).then(response => {
          if (!response.ok) throw Error('Sound unavailable');
          return response.arrayBuffer();
        }).then(bytes => context.decodeAudioData(bytes)).catch(() => {
          buffers.delete(asset);
          return null;
        });
        buffers.set(asset, buffer);
      }
      const ready = Promise.all([resumed, buffers.get(asset)]);
      return () => {
        void ready.then(async ([running, buffer]) => {
          if (!running || !buffer) return;
          if (context.state !== 'running') await context.resume();
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          const release = asset === postingAsset
            ? withPlaybackAudio(source)
            : () => source.disconnect();
          source.onended = release;
          try {
            source.start();
          } catch {
            release();
          }
        }).catch(() => {});
      };
    } catch {
      // Posting remains available when audio is unavailable.
    }
  }

  function unlockPostingPlayer() {
    if (!useNativePlayer) return;
    if (!nativeReady) {
      postingPlayer ||= new Audio(silentClip);
      // Keep the same element for the real clip so it retains permission.
      nativeReady = postingPlayer.play().catch(() => {
        nativeReady = null;
        return false;
      }).then(result => result !== false);
    }
    return nativeReady;
  }

  function posting() {
    const fallback = prepare(postingAsset);
    const ready = unlockPostingPlayer();
    if (!ready) return fallback;
    const player = postingPlayer;
    return async () => {
      try {
        if (await ready) {
          if (player.getAttribute('src') !== postingAsset) {
            player.src = postingAsset;
          }
          player.currentTime = 0;
          await player.play();
          return;
        }
      } catch {
        if (postingPlayer === player) {
          nativeReady = null;
          postingPlayer = null;
        }
      }
      fallback?.();
    };
  }

  return {
    primePosting: () => { posting(); },
    posting,
    rep: () => prepare('./assets/rep-coins.wav')
  };
})();
