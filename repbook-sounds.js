const repbookSounds = (() => {
  const postingAsset = './assets/repbook-post-chime.wav?v=focus-pulse';
  const buffers = new Map();
  let context;
  let activeChimes = 0;
  let previousSessionType;

  function withTransientAudio(source) {
    const session = navigator.audioSession;
    if (!session) return () => source.disconnect();

    if (!activeChimes) {
      previousSessionType = session.type;
      try {
        session.type = 'transient';
      } catch {
        // Continue with the browser's default audio session.
      }
    }
    activeChimes++;
    return () => {
      source.disconnect();
      activeChimes--;
      if (!activeChimes && session.type === 'transient') {
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
            ? withTransientAudio(source)
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

  return {
    primePosting: () => { prepare(postingAsset); },
    posting: () => prepare(postingAsset),
    rep: () => prepare('./assets/rep-coins.wav')
  };
})();
