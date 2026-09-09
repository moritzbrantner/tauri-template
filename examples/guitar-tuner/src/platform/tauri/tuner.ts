import { invoke } from "@tauri-apps/api/core";

export type TuningStatus = "listening" | "inTune" | "flat" | "sharp";

export interface TuningReading {
  detectedFrequencyHz: number | null;
  detectedNote: string | null;
  targetString: string | null;
  targetFrequencyHz: number | null;
  cents: number | null;
  confidence: number;
  status: TuningStatus;
}

export async function analyzePitch(
  samples: number[],
  sampleRate: number,
): Promise<TuningReading> {
  return invoke<TuningReading>("analyze_pitch", { samples, sampleRate });
}
