use std::fs;
use std::error::Error;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use crate::data_bursatil_client::get_cotizaciones_async;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub asset: String,
    pub price: f64,
    pub change: f64,  // Este es el porcentaje de cambio que viene de la API
}

#[derive(Debug, Clone)]
struct CachedData {
    assets: Vec<Asset>,
    timestamp: Instant,
}

// Cache global para los datos del heatmap (5 minutos de duración)
lazy_static::lazy_static! {
    static ref HEATMAP_CACHE: Arc<Mutex<Option<CachedData>>> = Arc::new(Mutex::new(None));
}

const CACHE_DURATION: Duration = Duration::from_secs(1200); // 5 minutos

pub async fn load_index() -> Result<Vec<Asset>, Box<dyn Error>> {
    // Verificar si tenemos datos en cache válidos
    {
        let cache = HEATMAP_CACHE.lock().unwrap();
        if let Some(cached_data) = &*cache {
            if cached_data.timestamp.elapsed() < CACHE_DURATION {
                println!("[HEATMAP] Using cached data (age: {:?})", cached_data.timestamp.elapsed());
                return Ok(cached_data.assets.clone());
            }
        }
    }

    println!("[HEATMAP] Cache expired or empty, fetching fresh data...");

    // Intentar leer el archivo desde varias ubicaciones posibles
    let possible_paths = [
        "ipc.json",           // En el directorio src-tauri
        "../ipc.json",        // En el directorio raíz del proyecto
        "../../ipc.json",     // Por si está ejecutándose desde target/debug
    ];
    
    let mut content = String::new();
    let mut found = false;
    
    for path in possible_paths.iter() {
        match fs::read_to_string(path) {
            Ok(file_content) => {
                content = file_content;
                found = true;
                println!("[HEATMAP] Found ipc.json at: {}", path);
                break;
            },
            Err(_) => {
                println!("[HEATMAP] ipc.json not found at: {}", path);
                continue;
            }
        }
    }
    
    if !found {
        return Err("Could not find ipc.json file in any expected location".into());
    }
    
    let tickers: Vec<String> = serde_json::from_str(&content)?;

    let mut activos: Vec<Asset> = Vec::new();

    for ticker in tickers {
        println!("[HEATMAP] Processing ticker: {}", ticker);
        
        match get_cotizaciones_async(&ticker).await {
            Ok(Some(cotizacion)) => {
                let precio = cotizacion.ultimo_precio.unwrap_or(0.0);
                let cambio = cotizacion.cambio.unwrap_or(0.0); 

                let asset = Asset {
                    asset: ticker.clone(), 
                    price: precio,
                    change: cambio, 
                };

                activos.push(asset);
                println!("[HEATMAP] Successfully processed {}: price={}, change={}%", 
                    ticker, precio, cambio);
            },
            Ok(None) => {
                println!("[HEATMAP] No data found for ticker: {}", ticker);
            },
            Err(e) => {
                println!("[HEATMAP] Error processing ticker {}: {}", ticker, e);
            }
        }
    }

    // Ordenar por porcentaje de cambio (descendente)
    activos.sort_by(|a, b| b.change.partial_cmp(&a.change).unwrap_or(std::cmp::Ordering::Equal));

    println!("[HEATMAP] Completed processing {} assets, sorted by performance", activos.len());

    // Guardar en cache
    {
        let mut cache = HEATMAP_CACHE.lock().unwrap();
        *cache = Some(CachedData {
            assets: activos.clone(),
            timestamp: Instant::now(),
        });
        println!("[HEATMAP] Data cached for {} seconds", CACHE_DURATION.as_secs());
    }

    Ok(activos)
}