use std::sync::Mutex;

type TunerState = Mutex<guitar_tuner_core::GuitarTuner>;

#[tauri::command]
fn analyze_pitch(
    state: tauri::State<'_, TunerState>,
    samples: Vec<f32>,
    sample_rate: u32,
) -> Result<guitar_tuner_core::TuningReading, String> {
    let mut tuner = state
        .lock()
        .map_err(|_| "guitar tuner state is unavailable".to_string())?;
    tuner.analyze(&samples, sample_rate)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(guitar_tuner_core::GuitarTuner::default()))
        .invoke_handler(tauri::generate_handler![analyze_pitch])
        .run(tauri::generate_context!())
        .expect("error while running guitar tuner example");
}
