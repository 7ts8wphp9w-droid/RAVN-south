const repbookSounds = (() => {
  const buffers = new Map();
  let context;

  function prepare(asset) {
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) return;
      context ||= new AudioEngine();
      // Resume during the submit gesture, before the network request.
      const resumed = context.resume().then(() => true, () => false);
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
        void ready.then(([running, buffer]) => {
          if (!running || !buffer) return;
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          source.onended = () => source.disconnect();
          source.start();
        }).catch(() => {});
      };
    } catch {
      // Posting remains available when audio is unavailable.
    }
  }

  return {
    posting: () => prepare('./assets/repbook-post-chime.wav'),
    rep: () => prepare('./assets/rep-coins.wav')
  };
})();
