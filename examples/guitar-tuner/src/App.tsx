import { useEffect, useRef, useState } from "react";
import { startMicrophone, type MicrophoneSession } from "./audio/microphone";
import { analyzePitch, type TuningReading } from "./platform/tauri/tuner";

function statusText(reading: TuningReading | null): string {
  if (!reading || reading.status === "listening") {
    return "Play one string and let it ring.";
  }
  if (reading.status === "inTune") {
    return "In tune";
  }
  return reading.status === "flat" ? "Tune up" : "Tune down";
}

function centsText(reading: TuningReading | null): string {
  if (reading?.cents == null) {
    return "—";
  }
  const rounded = Math.round(reading.cents);
  return `${rounded > 0 ? "+" : ""}${rounded} cents`;
}

export default function App() {
  const sessionRef = useRef<MicrophoneSession | null>(null);
  const startingRef = useRef(false);
  const disposedRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [reading, setReading] = useState<TuningReading | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      void sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  async function startListening() {
    if (startingRef.current || sessionRef.current) {
      return;
    }

    startingRef.current = true;
    setStarting(true);
    setError(null);

    try {
      const session = await startMicrophone(async (samples, sampleRate) => {
        try {
          setReading(await analyzePitch(samples, sampleRate));
          setError(null);
        } catch {
          setError("Pitch analysis requires the Tauri desktop runtime.");
        }
      });

      if (disposedRef.current) {
        await session.stop();
        return;
      }

      sessionRef.current = session;
      setListening(true);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Could not open microphone.");
    } finally {
      startingRef.current = false;
      if (!disposedRef.current) {
        setStarting(false);
      }
    }
  }

  async function stopListening() {
    const session = sessionRef.current;
    sessionRef.current = null;
    await session?.stop();
    setListening(false);
    setReading(null);
  }

  const cents = Math.max(-50, Math.min(50, reading?.cents ?? 0));
  const needleDegrees = cents * 1.5;
  const detectedFrequency = reading?.detectedFrequencyHz?.toFixed(1) ?? "—";
  const targetFrequency = reading?.targetFrequencyHz?.toFixed(1) ?? "—";

  return (
    <main className="shell">
      <section className="tuner" aria-labelledby="tuner-title">
        <header className="intro">
          <p className="eyebrow">Tauri + Rust</p>
          <h1 id="tuner-title">Guitar tuner</h1>
          <p>Pluck one string. The microphone stays local; Rust decides the pitch and tuning.</p>
        </header>

        <div className="meter" aria-label="Tuning meter">
          <div className="meter-scale" aria-hidden="true">
            <span>♭</span>
            <span className="center-mark">0</span>
            <span>♯</span>
          </div>
          <div className="needle" style={{ transform: `rotate(${needleDegrees}deg)` }} />
          <div className="needle-pivot" />
        </div>

        <div className="reading" aria-live="polite">
          <div className="note-row">
            <span className="detected-note">{reading?.detectedNote ?? "—"}</span>
            <span className="arrow">→</span>
            <span className="target-note">{reading?.targetString ?? "—"}</span>
          </div>
          <strong className={`status status-${reading?.status ?? "listening"}`}>
            {statusText(reading)}
          </strong>
          <p className="cents">{centsText(reading)}</p>
          <p className="frequency">
            {detectedFrequency} Hz detected · {targetFrequency} Hz target
          </p>
        </div>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="listen-button"
          type="button"
          disabled={starting}
          onClick={listening ? stopListening : startListening}
        >
          {starting ? "Opening microphone…" : listening ? "Stop listening" : "Use microphone"}
        </button>
        <p className="privacy">Audio is analyzed in memory and is not saved or sent to a server.</p>
      </section>
    </main>
  );
}
