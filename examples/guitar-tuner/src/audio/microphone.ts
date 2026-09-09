export type MicrophoneSession = {
  stop(): Promise<void>;
};

export type AudioFrameHandler = (samples: number[], sampleRate: number) => Promise<void>;

const ANALYSIS_WINDOW_SIZE = 8192;
const ANALYSIS_INTERVAL_MS = 120;

export async function startMicrophone(onFrame: AudioFrameHandler): Promise<MicrophoneSession> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone capture is not available in this WebView.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
    },
    video: false,
  });
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  const mutedOutput = context.createGain();
  analyser.fftSize = ANALYSIS_WINDOW_SIZE;
  analyser.smoothingTimeConstant = 0;
  mutedOutput.gain.value = 0;
  source.connect(analyser);
  analyser.connect(mutedOutput);
  mutedOutput.connect(context.destination);

  const samples = new Float32Array(analyser.fftSize);
  let analysisPending = false;
  let stopped = false;

  const interval = window.setInterval(async () => {
    if (stopped || analysisPending) {
      return;
    }

    analyser.getFloatTimeDomainData(samples);
    analysisPending = true;
    try {
      await onFrame(Array.from(samples), Math.round(context.sampleRate));
    } finally {
      analysisPending = false;
    }
  }, ANALYSIS_INTERVAL_MS);

  return {
    async stop() {
      if (stopped) {
        return;
      }
      stopped = true;
      window.clearInterval(interval);
      source.disconnect();
      analyser.disconnect();
      mutedOutput.disconnect();
      for (const track of stream.getTracks()) {
        track.stop();
      }
      await context.close();
    },
  };
}
