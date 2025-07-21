use crate::assets;
use serde::{Serialize, Deserialize};
use serde_json::json;
use deadpool_postgres::Client;

#[derive(Serialize, Deserialize, Debug)]
pub struct IntradiaData {
    pub price: f64,
    pub open: f64,
    pub volume: i64,
    pub change: f64,
    pub change_percent: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FinancialStatement {
    pub anio: i32,
    pub trimestre: String,
    pub utilidad_neta: f64,
    pub flujo_operativo: f64,
    pub depreciacion: f64,
    pub cambio_inventarios: f64,
    pub impuestos_pagados: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AssetDetails {
    pub razon_social: String,
    pub emisoras: String,
    pub serie: String,
    pub tipo_valor: Option<String>,
    pub intradia: IntradiaData,
    pub finantial_flow: std::collections::HashMap<String, f64>,
    pub finantial_position: std::collections::HashMap<String, f64>,
    pub quarter_result: std::collections::HashMap<String, f64>,
    pub trimestres_disponibles: Vec<String>,
    pub historical_prices: Vec<HistoricalPrice>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HistoricalPrice {
    pub date: String,
    pub close: Option<f64>,
}

#[tauri::command]
pub async fn get_asset_details(ticker: String, state: tauri::State<'_, crate::AppState>) -> Result<AssetDetails, String> {

    let client = state.db_pool.get().await.map_err(|e| e.to_string())?;
    println!("[DEBUG] Processing ticker: {}", ticker);
    
    // Buscar directamente en la tabla emisoras usando el ticker completo o partes del mismo
    let search_sql = "SELECT razon_social, emisoras, serie FROM emisoras WHERE emisoras || serie = $1 OR emisoras = $1 LIMIT 1";
    let row_opt = client.query_opt(search_sql, &[&ticker]).await.map_err(|e| e.to_string())?;
    
    let row = if let Some(row) = row_opt {
        println!("[DEBUG] Found direct match for ticker: {}", ticker);
        row
    } else {
        // Si no se encuentra directo, buscar por coincidencia parcial
        println!("[DEBUG] No direct match, searching partial matches...");
        let partial_sql = "SELECT razon_social, emisoras, serie FROM emisoras WHERE $1 LIKE emisoras || '%' ORDER BY LENGTH(emisoras) DESC LIMIT 1";
        let partial_row = client.query_opt(partial_sql, &[&ticker]).await.map_err(|e| e.to_string())?;
        
        if let Some(row) = partial_row {
            println!("[DEBUG] Found partial match for ticker: {}", ticker);
            row
        } else {
            // Como último recurso, usar el primer resultado de emisoras similares
            println!("[DEBUG] No partial match, using similar emisoras...");
            let similar_sql = "SELECT razon_social, emisoras, serie FROM emisoras WHERE emisoras ILIKE '%' || $1 || '%' LIMIT 1";
            let ticker_prefix = &ticker[..ticker.len().min(6)];
            let similar_row = client.query_opt(similar_sql, &[&ticker_prefix]).await.map_err(|e| e.to_string())?;
            
            similar_row.ok_or_else(|| format!("No emisora found for ticker: {}", ticker))?
        }
    };
    
    println!("[DEBUG] Successfully found emisora data");

    let emisora_db: String = row.get("emisoras");
    let serie_db: String = row.get("serie");
    let ticker_key = format!("{}{}", emisora_db, serie_db);
    println!("[DEBUG] Using - emisora: '{}', serie: '{}', ticker_key: '{}'", emisora_db, serie_db, ticker_key);
    
    println!("[DEBUG] Calling get_cotizaciones_async for ticker_key: '{}'", ticker_key);
    let cot_actual = crate::data_bursatil_client::get_cotizaciones_async(&ticker_key).await.map_err(|e| {
        println!("[ERROR] get_cotizaciones_async failed for '{}': {}", ticker_key, e);
        e.to_string()
    })?;
    println!("[DEBUG] get_cotizaciones_async completed successfully");
    
    let mut price = 0.0;
    let mut open = 0.0;
    let mut volume = 0;
    let mut change_percent = 0.0;

    if let Some(cot) = &cot_actual {
        price = cot.precio_promedio.unwrap_or(0.0);
        open = cot.ultimo_precio.unwrap_or(0.0);
        volume = cot.volumen.unwrap_or(0.0) as i64;
        change_percent = cot.cambio.unwrap_or(0.0);
    }

    let change = price*(change_percent/100.0);

    let intradia = IntradiaData {
        price,
        open,
        volume,
        change, 
        change_percent, 
    };
    println!("[DEBUG] IntradiaData created successfully");

    println!("[DEBUG] Starting financial data retrieval for emisora: {}", emisora_db);
    
    // Obtener datos financieros de manera más robusta
    let fiflow = assets::get_finantial_flow(&state.db_pool, &emisora_db, "1T_2025").await
        .unwrap_or_else(|e| {
            println!("[WARN] get_finantial_flow failed, using empty data: {}", e);
            std::collections::HashMap::new()
        });
    println!("[DEBUG] get_finantial_flow completed");
    
    let fiqu = assets::get_quarterly_income_statement(&state.db_pool, &emisora_db, "1T_2025").await
        .unwrap_or_else(|e| {
            println!("[WARN] get_quarterly_income_statement failed, using empty data: {}", e);
            std::collections::HashMap::new()
        });
    println!("[DEBUG] get_quarterly_income_statement completed");
    
    let fipo = assets::get_finantial_position(&state.db_pool, &emisora_db, "1T_2025").await
        .unwrap_or_else(|e| {
            println!("[WARN] get_finantial_position failed, using empty data: {}", e);
            std::collections::HashMap::new()
        });
    println!("[DEBUG] get_finantial_position completed");
    let finantial_flow = fiflow;
    let finantial_position = fipo;
    let quarter_result = fiqu;
    
    println!("[DEBUG] Getting tipo_valor...");
    let tipo_valor = get_tipo_valor(&emisora_db, &client).await.unwrap_or(None);
    println!("[DEBUG] tipo_valor completed: {:?}", tipo_valor);
    
    println!("[DEBUG] Getting trimestres_disponibles...");
    let trimestres_disponibles = match assets::get_trimestres_disponibles(&state.db_pool, &emisora_db).await {
        Ok(trimestres) => {
        println!("[DEBUG] Found {} trimestres", trimestres.len());
            trimestres
        },
        Err(e) => {
            println!("[WARN] get_trimestres_disponibles failed: {}", e);
            Vec::new()
        }
    };
    println!("[DEBUG] trimestres_disponibles completed: {} items", trimestres_disponibles.len());
    
    println!("[DEBUG] Getting historical_data_intradia...");
    let historical_raw = assets::historical_data_intradia(&ticker_key, 60, &state.db_pool).await
        .unwrap_or_else(|e| {
            println!("[WARN] historical_data_intradia failed, using empty list: {}", e);
            Vec::new()
        });
    println!("[DEBUG] historical_data_intradia completed: {} items", historical_raw.len());
    let historical_prices = historical_raw.into_iter().map(|d| HistoricalPrice {
        date: d.date.to_string(),
        close: d.close,
    }).collect();
    
    let result = AssetDetails {
        razon_social: row.get("razon_social"),
        emisoras: row.get("emisoras"),
        serie: row.get("serie"),
        tipo_valor,
        intradia,
        finantial_flow,
        finantial_position,
        quarter_result,
        trimestres_disponibles,
        historical_prices,
    };
    
    println!("[DEBUG] Asset details completed for emisora: {}", emisora_db);
    Ok(result)
}


pub async fn get_emisora_from_ticker(ticker: &str, client: &Client) -> Option<String> {
    println!("[DEBUG] Searching emisora for ticker: {}", ticker);
    
    // Primero buscar coincidencias exactas
    for len in (1..=ticker.len()).rev() {
        let emisora_candidate = &ticker[..len];
        println!("[DEBUG] Trying emisora candidate: {}", emisora_candidate);
        let row = client
            .query_opt(
                "SELECT emisoras FROM emisoras WHERE emisoras = $1",
                &[&emisora_candidate],
            )
            .await
            .ok()?;
        if let Some(row) = row {
            let found: String = row.get("emisoras");
            println!("[DEBUG] Found emisora: {} for ticker: {}", found, ticker);
            return Some(found);
        }
    }
    
    // Si no se encuentra, buscar variaciones comunes
    println!("[DEBUG] No exact match found, searching similar emisoras...");
    let similar_sql = "SELECT emisoras FROM emisoras WHERE emisoras ILIKE $1 LIMIT 10";
    let like_pattern = format!("%{}%", ticker);
    if let Ok(rows) = client.query(similar_sql, &[&like_pattern]).await {
        println!("[DEBUG] Similar emisoras found:");
        for row in &rows {
            let emisora: String = row.get(0);
            println!("[DEBUG]   - {}", emisora);
        }
        
        // Si encontramos similares, usar el primero que contenga la parte principal
        for row in &rows {
            let emisora: String = row.get(0);
            if ticker.starts_with(&emisora) || emisora.contains(&ticker[..ticker.len().min(6)]) {
                println!("[DEBUG] Auto-selecting similar emisora: {} for ticker: {}", emisora, ticker);
                return Some(emisora);
            }
        }
        
        // Si no hay coincidencia lógica, usar el primer resultado
        if let Some(first_row) = rows.first() {
            let emisora: String = first_row.get(0);
            println!("[DEBUG] Using first similar emisora: {} for ticker: {}", emisora, ticker);
            return Some(emisora);
        }
    }
    
    // Como último recurso, buscar en toda la tabla emisoras que tengan relación con el ticker
    println!("[DEBUG] Trying broader search...");
    let broad_sql = "SELECT DISTINCT emisoras FROM emisoras ORDER BY emisoras LIMIT 20";
    if let Ok(rows) = client.query(broad_sql, &[]).await {
        println!("[DEBUG] Sample emisoras in database:");
        for (i, row) in rows.iter().take(10).enumerate() {
            let emisora: String = row.get(0);
            println!("[DEBUG]   {}. {}", i+1, emisora);
        }
    }
    
    None
}



#[tauri::command]
pub async fn get_emisora_info(emisora: String, trimestre: Option<String>, state: tauri::State<'_, crate::AppState>) -> Result<String, String> {
    let client = state.db_pool.get().await.map_err(|e| e.to_string())?;

    let trimestres: Vec<String> = if let Some(t) = trimestre {
        vec![t]
    } else {
        let sql = "SELECT DISTINCT trimestre FROM public.estado_flujos WHERE LOWER(emisora) = LOWER($1) ORDER BY trimestre DESC LIMIT 4";
        let rows = client.query(sql, &[&emisora])
            .await 
            .map_err(|e| e.to_string())?;
        
        let mut ts: Vec<String> = rows.iter().map(|row| row.get(0)).collect();
        ts.sort(); 
        ts
    };

    let mut resultados = Vec::new();
    for t in &trimestres {
        
        let asset_details = assets::get_assets_details(&state.db_pool, &emisora, Some(t))
            .await 
            .map_err(|e| format!("Error getting asset details for {}: {}", t, e))?;
            
        resultados.push(json!({
            "trimestre": t,
            "cashflow": asset_details.finantial_flow,
            "position": asset_details.finantial_position,
            "income": asset_details.quarter_result
        }));
    }

    let result = json!({
        "emisora": emisora,
        "trimestres": trimestres,
        "datos": resultados
    });

    serde_json::to_string(&result).map_err(|e| format!("JSON serialization error: {}", e))
}

pub async fn get_tipo_valor(emisora: &str, client: &Client) -> Result<Option<String>, String> {
    let sql = "SELECT tipo_valor FROM public.emisoras WHERE LOWER(emisoras) = LOWER($1) LIMIT 1";
    let row_opt = client.query_opt(sql, &[&emisora]).await
        .map_err(|e| format!("Error al consultar tipo_valor para '{}': {}", emisora, e))?;
    if let Some(row) = row_opt {
        match row.try_get::<_, Option<String>>("tipo_valor") {
            Ok(Some(value)) => Ok(Some(value)),
            Ok(None) => Ok(None),
            Err(e) => Err(format!("Error al leer tipo_valor para '{}': {}", emisora, e)),
        }
    } else {
        Ok(None)
    }
}