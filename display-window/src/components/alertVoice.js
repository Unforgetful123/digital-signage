// Both the TV and PC receiver synthesize the same PCM with the same offline voice.
import engineUrl from '@echogarden/espeak-ng-emscripten/espeak-ng.js?url';
import dataUrl from '@echogarden/espeak-ng-emscripten/espeak-ng.data?url';

let engine;
function loadVoiceData() {
  // XMLHttpRequest also supports local assets in the packaged Electron player.
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', dataUrl);
    request.responseType = 'arraybuffer';
    request.onload = () => request.response && (request.status === 200 || request.status === 0)
      ? resolve(request.response) : reject(new Error('Alert voice data unavailable'));
    request.onerror = () => reject(new Error('Could not load alert voice data'));
    request.send();
  });
}

function loadEngine() {
  if (!engine) {
    engine = Promise.all([import(/* @vite-ignore */ new URL(engineUrl, document.baseURI).href), loadVoiceData()])
      .then(async ([module, data]) => {
        const library = await module.default({ getPreloadedPackage: () => data });
        return new library.eSpeakNGWorker();
      }).catch(error => { engine = undefined; throw error; });
  }
  return engine;
}

function renderVoice(synth, text, language) {
  const lang = (language || 'en').split('-')[0];
  if (synth.set_voice('', lang, 0, 0, 0) !== 0) throw new Error('Voice unavailable: ' + lang);
  synth.set_rate(150);
  const chunks = [];
  let bytes = 0;
  synth.synthesize(text, samples => {
    chunks.push(samples);
    bytes += samples.byteLength;
    return false;
  });
  if (!bytes) throw new Error('Alert voice produced no audio');
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const tag = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  const rate = synth.get_samplerate();
  tag(0, 'RIFF'); view.setUint32(4, bytes + 36, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  tag(36, 'data'); view.setUint32(40, bytes, true);
  return URL.createObjectURL(new Blob([header, ...chunks], {type:'audio/wav'}));
}

export function createAlertVoice() {
  const audio = new Audio();
  let stopped = false, url, finish;
  return {
    async speak(text, language) {
      try {
        if (!url) {
          const synth = await loadEngine();
          if (stopped) return;
          url = renderVoice(synth, text, language);
          audio.src = url;
        }
        if (stopped) return;
        await new Promise((resolve, reject) => {
          finish = resolve; audio.onended = resolve;
          audio.onerror = () => reject(new Error('Alert audio unavailable'));
          audio.currentTime = 0;
          audio.play().catch(reject);
        });
      } catch (error) {
        console.warn('Using device voice because shared alert audio failed', error);
        if (stopped || !window.speechSynthesis) return;
        await new Promise(resolve => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = language;
          utterance.rate = 0.85;
          const timer = setTimeout(() => { window.speechSynthesis.cancel(); resolve(); }, 90000);
          finish = () => { clearTimeout(timer); resolve(); };
          utterance.onend = utterance.onerror = finish;
          window.speechSynthesis.speak(utterance);
        });
      }
    },
    stop() {
      stopped = true; audio.pause(); finish?.(); window.speechSynthesis?.cancel();
      audio.onerror = audio.onended = null;
      if (url) URL.revokeObjectURL(url);
    },
  };
}
