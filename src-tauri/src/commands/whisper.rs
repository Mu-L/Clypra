use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgressPayload {
    pub size: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub speed_bytes_per_sec: u64,
}

/// Download a Whisper model from Hugging Face or OpenAI CDN
#[tauri::command]
pub async fn download_whisper_model(
    app: tauri::AppHandle,
    size: String,
) -> Result<(), String> {
    // TODO: Implement actual download from Hugging Face / OpenAI CDN
    // Model URLs (example):
    // tiny: https://openaipublic.azureedge.net/main/whisper/models/65147644a518d12f04e32d6f3b26facc3f8dd46e5390956a9424a650c0ce22b9/tiny.pt
    // base: https://openaipublic.azureedge.net/main/whisper/models/ed3a0b6b1c0edf879ad9b11b1af5a0e6ab5db9205f891f668f8b0e6c6326e34e/base.pt
    // small: https://openaipublic.azureedge.net/main/whisper/models/9ecf779972d90ba49c06d968637d720dd632c55bbf19d441fb42bf17a411e794/small.pt
    // medium: https://openaipublic.azureedge.net/main/whisper/models/345ae4da62f9b3d59415adc60127b97c714f32e89e936602e85993674d08dcb1/medium.pt
    // large-v3: https://openaipublic.azureedge.net/main/whisper/models/e5b1a55b89c1367dacf97e3e19bfd829a01529dbfdeefa8caeb59b3f1b81dadb/large-v3.pt

    // Get app data directory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let models_dir = app_data_dir.join("models").join("whisper");
    
    // Create models directory if it doesn't exist
    std::fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Failed to create models directory: {}", e))?;

    let model_path = models_dir.join(format!("{}.bin", size));

    // Simulate download progress for now
    // In real implementation, use reqwest or similar HTTP client
    eprintln!("🦀 [download_whisper_model] Would download {} to {:?}", size, model_path);

    // Emit progress events
    let _ = app.emit(
        "whisper_model_progress",
        DownloadProgressPayload {
            size: size.clone(),
            downloaded_bytes: 0,
            total_bytes: 100_000_000, // Example: 100MB
            speed_bytes_per_sec: 0,
        },
    );

    // TODO: Actual download implementation
    // 1. Determine the correct URL based on model size
    // 2. Stream download with progress tracking
    // 3. Emit progress events periodically
    // 4. Save to model_path
    // 5. Verify checksum/integrity

    Ok(())
}

/// Delete a downloaded Whisper model
#[tauri::command]
pub async fn delete_whisper_model(
    app: tauri::AppHandle,
    size: String,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let model_path = app_data_dir
        .join("models")
        .join("whisper")
        .join(format!("{}.bin", size));

    if model_path.exists() {
        std::fs::remove_file(&model_path)
            .map_err(|e| format!("Failed to delete model file: {}", e))?;
        eprintln!("🦀 [delete_whisper_model] Deleted model: {:?}", model_path);
    }

    Ok(())
}

/// List all downloaded Whisper models
#[tauri::command]
pub async fn list_downloaded_models(
    app: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let models_dir = app_data_dir.join("models").join("whisper");

    if !models_dir.exists() {
        return Ok(vec![]);
    }

    let mut models = Vec::new();

    let entries = std::fs::read_dir(&models_dir)
        .map_err(|e| format!("Failed to read models directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(stem) = path.file_stem() {
                if let Some(name) = stem.to_str() {
                    models.push(name.to_string());
                }
            }
        }
    }

    Ok(models)
}

/// Cancel an ongoing Whisper model download
#[tauri::command]
pub async fn cancel_whisper_download(
    size: String,
) -> Result<(), String> {
    // TODO: Implement download cancellation
    // This requires maintaining a registry of active downloads with cancellation tokens
    eprintln!("🦀 [cancel_whisper_download] Would cancel download for: {}", size);
    Ok(())
}

/// Verify if a Whisper model is actually downloaded to disk
#[tauri::command]
pub async fn verify_whisper_model_exists(
    app: tauri::AppHandle,
    size: String,
) -> Result<bool, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let model_path = app_data_dir
        .join("models")
        .join("whisper")
        .join(format!("{}.bin", size));

    let exists = model_path.exists() && model_path.is_file();
    
    if exists {
        // Also check file size to ensure it's not a corrupted/empty file
        if let Ok(metadata) = std::fs::metadata(&model_path) {
            let file_size = metadata.len();
            eprintln!("🦀 [verify_whisper_model_exists] Model '{}' at {:?}: exists ({}MB)", 
                size, model_path, file_size / 1_048_576);
            
            // Whisper models should be at least 1MB (even tiny is ~39MB)
            if file_size < 1_000_000 {
                eprintln!("⚠️ [verify_whisper_model_exists] Model file too small, likely corrupted");
                return Ok(false);
            }
        }
    } else {
        eprintln!("🦀 [verify_whisper_model_exists] Model '{}' at {:?}: not found", size, model_path);
    }
    
    Ok(exists)
}
