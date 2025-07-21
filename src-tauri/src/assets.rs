use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::Datelike;
fn get_ultimo_dia_habil(fecha: chrono::NaiveDate) -> chrono::NaiveDate {
    use chrono::{Duration, Weekday};
    let mut ultima_fecha = fecha;
    
    loop {
        match ultima_fecha.weekday() {
            Weekday::Sat => {
                println!("[DEBUG] {} is Saturday, moving to Friday", ultima_fecha);
                ultima_fecha = ultima_fecha - Duration::days(1);
            }, 
            Weekday::Sun => {
                println!("[DEBUG] {} is Sunday, moving to Friday", ultima_fecha);
                ultima_fecha = ultima_fecha - Duration::days(2);
            }, 
            _ => {
                println!("[DEBUG] {} is a business day ({})", ultima_fecha, ultima_fecha.weekday());
                break;
            }
        }
    }
    
    ultima_fecha
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyClose {
    pub date: chrono::NaiveDate,
    pub close: Option<f64>,
}

pub async fn get_trimestres_disponibles(pool: &Pool, emisora: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let client = match pool.get().await {
        Ok(client) => client,
        Err(e) => {
            println!("[ERROR] Failed to get database connection: {}", e);
            return Ok(Vec::new()); // Devolver vacío en lugar de error
        }
    };
    
    let query = "SELECT rangos_financieros FROM public.emisoras WHERE LOWER(emisoras) = LOWER($1) LIMIT 1";
    
    let row_opt = match client.query_opt(query, &[&emisora]).await {
        Ok(row_opt) => row_opt,
        Err(e) => {
            println!("[ERROR] Database query failed: {}", e);
            return Ok(Vec::new()); // Devolver vacío en lugar de error
        }
    };
    
    if let Some(row) = row_opt {
        if let Some(rangos_str) = row.get::<_, Option<String>>("rangos_financieros") {
            // Dividir la cadena por coma y espacio
            let mut trimestres: Vec<String> = rangos_str
                .split(", ")
                .map(|s| s.to_string())
                .filter(|s| !s.is_empty() && s.contains("T_"))
                .collect();
            
            trimestres.sort();
            println!("[DEBUG] Found {} trimestres for emisora '{}'", trimestres.len(), emisora);
            return Ok(trimestres);
        }
    }
    
    println!("[DEBUG] No rangos_financieros found for emisora '{}'", emisora);
    Ok(Vec::new())
}

pub async fn get_finantial_flow(
    pool: &Pool,
    emisora: &str, 
    trimestre: &str
) -> Result<std::collections::HashMap<String, f64>, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let row = client.query_one(
        "SELECT EXISTS (
            SELECT 1 FROM public.estado_flujos
            WHERE LOWER(emisora) = LOWER($1)
              AND LOWER(trimestre) = LOWER($2)
        ) AS existe",
        &[&emisora, &trimestre],
    ).await?;
    let existe: bool = row.get("existe");
    if !existe {
        crate::data_bursatil_client::get_flujos_financieros(&client, emisora, trimestre).await?;
    }
    let row = client.query_one(
        "SELECT flujo_operacion, utilidad_neta, depreciacion, cambio_inventarios,
            cambio_cxc, cambio_cxp, impuestos_pagados, intereses_pagados, flujo_inversion,
            capex, venta_activos, compra_intangibles, flujo_financiamiento, prestamos_obtenidos, 
            pago_deuda, dividendos_pagados, recompras, cambio_efectivo, efectivo_final, efecto_tc, deterioros,
            partidas_no_monetarias, costos_financieros
        FROM public.estado_flujos
        WHERE LOWER(emisora) = LOWER($1)
          AND LOWER(trimestre) = LOWER($2)
        LIMIT 1",
        &[&emisora, &trimestre],
    ).await?;
    let columnas = [
        "flujo_operacion", "utilidad_neta", "depreciacion", "cambio_inventarios",
        "cambio_cxc", "cambio_cxp", "impuestos_pagados", "intereses_pagados", "flujo_inversion",
        "capex", "venta_activos", "compra_intangibles", "flujo_financiamiento", "prestamos_obtenidos", 
        "pago_deuda", "dividendos_pagados", "recompras", "cambio_efectivo", "efectivo_final", "efecto_tc", "deterioros",
        "partidas_no_monetarias", "costos_financieros"
    ];
    let mut estados_financieros = std::collections::HashMap::new();
    for (i, col) in columnas.iter().enumerate() {
        let valor: Option<f64> = row.get(i);
        estados_financieros.insert(col.to_string(), valor.unwrap_or(0.0));
    }
    Ok(estados_financieros)
}

pub async fn get_finantial_position(
    pool: &Pool,
    emisora: &str,
    trimestre: &str
) -> Result<HashMap<String, f64>, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let row = client.query_one(
        "SELECT EXISTS (
            SELECT 1 FROM public.estado_posicion
            WHERE LOWER(emisora) = LOWER($1)
              AND LOWER(trimestre) = LOWER($2)
        ) AS existe",
        &[&emisora, &trimestre],
    ).await?;
    let existe: bool = row.get("existe");
    if !existe {
        crate::data_bursatil_client::get_posicion_financiera(&client, emisora, trimestre).await?;
    }
    let row = client.query_one(
        "SELECT currentassets, currentliabilities, cashandcashequivalents, inventories,
            tradeandothercurrentreceivables, tradeandothercurrentpayables, equity, liabilities,
            noncurrentliabilities, equityattributabletoownersofparent, noncontrollinginterests,
            propertyplantandequipment, intangibleassetsotherthangoodwill, goodwill,
            rightofuseassetsthatdonotmeetdefinitionofinvestmentproperty, deferredtaxassets,
            deferredtaxliabilities, noncurrentassetsordisposalgroupsclassifiedasheldforsale,
            retainedearnings, issuedcapital, otherreserves, noncurrentleaseliabilities,
            othernoncurrentfinancialliabilities, noncurrentprovisionsforemployeebenefits
        FROM public.estado_posicion
        WHERE LOWER(emisora) = LOWER($1)
          AND LOWER(trimestre) = LOWER($2)
        LIMIT 1",
        &[&emisora, &trimestre],
    ).await?;
    let columnas = [
        "currentassets", "currentliabilities", "cashandcashequivalents", "inventories",
        "tradeandothercurrentreceivables", "tradeandothercurrentpayables", "equity", "liabilities",
        "noncurrentliabilities", "equityattributabletoownersofparent", "noncontrollinginterests",
        "propertyplantandequipment", "intangibleassetsotherthangoodwill", "goodwill",
        "rightofuseassetsthatdonotmeetdefinitionofinvestmentproperty", "deferredtaxassets",
        "deferredtaxliabilities", "noncurrentassetsordisposalgroupsclassifiedasheldforsale",
        "retainedearnings", "issuedcapital", "otherreserves", "noncurrentleaseliabilities",
        "othernoncurrentfinancialliabilities", "noncurrentprovisionsforemployeebenefits"
    ];
    let mut estados_posicion = HashMap::new();
    for (i, col) in columnas.iter().enumerate() {
        let valor: Option<f64> = row.get(i);
        estados_posicion.insert(col.to_string(), valor.unwrap_or(0.0));
    }
    Ok(estados_posicion)
}

pub async fn get_quarterly_income_statement(
    pool: &Pool,
    emisora: &str,
    trimestre: &str
) -> Result<HashMap<String, f64>, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let row = client.query_one(
        "SELECT EXISTS (
            SELECT 1 FROM public.estado_resultado_trimestral
            WHERE LOWER(emisora) = LOWER($1)
              AND LOWER(trimestre) = LOWER($2)
        ) AS existe",
        &[&emisora, &trimestre],
    ).await?;
    let existe: bool = row.get("existe");
    if !existe {
        crate::data_bursatil_client::get_estado_resultado_trimestral(&client, emisora, trimestre).await?;
    }
    let row = client.query_one(
        "SELECT revenue, grossprofit, profitlossfromoperatingactivities, profitloss, profitlossbeforetax, \
            costofsales, distributioncosts, administrativeexpense, financecosts, financeincome, \
            incometaxexpensecontinuingoperations, profitlossattributabletoownersofparent, \
            basicearningslosspershare, dilutedearningslosspershare, otherincome, \
            shareofprofitlossofassociatesandjointventuresaccountedforusinge, \
            profitlossfromdiscontinuedoperations, depreciacion
        FROM public.estado_resultado_trimestral
        WHERE LOWER(emisora) = LOWER($1)
          AND LOWER(trimestre) = LOWER($2)
        LIMIT 1",
        &[&emisora, &trimestre],
    ).await?;
    let columnas = [
        "revenue", "grossprofit", "profitlossfromoperatingactivities", "profitloss", "profitlossbeforetax",
        "costofsales", "distributioncosts", "administrativeexpense", "financecosts", "financeincome",
        "incometaxexpensecontinuingoperations", "profitlossattributabletoownersofparent",
        "basicearningslosspershare", "dilutedearningslosspershare", "otherincome",
        "shareofprofitlossofassociatesandjointventuresaccountedforusinge",
        "profitlossfromdiscontinuedoperations", "depreciacion"
    ];
    let mut estado_resultado = HashMap::new();
    for (i, col) in columnas.iter().enumerate() {
        let valor: Option<f64> = row.get(i);
        estado_resultado.insert(col.to_string(), valor.unwrap_or(0.0));
    }
    Ok(estado_resultado)
}

pub async fn historical_data_intradia(ticker: &str, months: i32, pool: &Pool) -> Result<Vec<DailyClose>, Box<dyn std::error::Error>> {
    use chrono::{Duration, Utc, NaiveDate};
    let client = pool.get().await?;
    
    // Obtener el último día hábil (lunes a viernes)
    let today = Utc::now().date_naive();
    let ultimo_dia_habil = get_ultimo_dia_habil(today);
    
    // Calcular fecha de inicio aproximada
    let requested_start_date_raw = ultimo_dia_habil - Duration::days((months as i64) * 30);
    // IMPORTANTE: También convertir la fecha de inicio a día hábil
    let requested_start_date = get_ultimo_dia_habil(requested_start_date_raw);
    
    println!("[DEBUG] Today: {}, Last business day: {}", today, ultimo_dia_habil);
    println!("[DEBUG] Raw start date: {}, Business start date: {}", requested_start_date_raw, requested_start_date);

    // Primero verificamos qué intervalos de datos existen para este ticker
    let check_sql = r#"
        SELECT MIN(fecha_hora::date) as min_date, 
               MAX(fecha_hora::date) as max_date, 
               COUNT(*) as total_records,
               COUNT(DISTINCT fecha_hora::date) as unique_days
        FROM intradia_data
        WHERE LOWER(emisora) = LOWER($1)
            AND precio > 0  -- Solo considerar precios válidos
    "#;
    
    let check_row = client.query_one(check_sql, &[&ticker]).await?;
    let min_date: Option<NaiveDate> = check_row.get("min_date");
    let max_date: Option<NaiveDate> = check_row.get("max_date");
    let total_records: i64 = check_row.get("total_records");
    let unique_days: i64 = check_row.get("unique_days");
    
    println!("[DEBUG] Checking historical data for ticker: {}", ticker);
    println!("[DEBUG] DB Info for {}: {} records across {} unique days from {:?} to {:?}", 
             ticker, total_records, unique_days, min_date, max_date);
    
    // Determinar el rango de fechas a usar basado en los datos disponibles
    let (query_start_date, query_end_date) = match (min_date, max_date) {
        (Some(min), Some(max)) => {
            // Tenemos datos: usar el intervalo disponible, limitado por la solicitud del usuario
            let effective_start = if requested_start_date > min {
                requested_start_date
            } else {
                min
            };
            
            let effective_end = if ultimo_dia_habil < max {
                ultimo_dia_habil
            } else {
                max
            };
            
            println!("[DEBUG] Using available data range: {} to {} (requested: {} to {})", 
                     effective_start, effective_end, requested_start_date, ultimo_dia_habil);
            
            (effective_start, effective_end)
        },
        _ => {
            // No hay datos o datos inválidos: intentar obtener datos del API
            println!("[DEBUG] No valid data found, attempting to fetch from API...");
            
            // Intentar diferentes variaciones del ticker
            let ticker_with_asterisk = format!("{}*", ticker);
            let ticker_without_asterisk = ticker.replace("*", "");
            let ticker_variations = vec![
                ticker,
                &ticker_with_asterisk,  // Agregar asterisco
                &ticker_without_asterisk, // Quitar asterisco
            ];
            
            let mut api_success = false;
            for variant in &ticker_variations {
                println!("[DEBUG] Trying ticker variant: {}", variant);
                match crate::data_bursatil_client::get_intradia_async(&[variant], &requested_start_date.to_string(), &ultimo_dia_habil.to_string(), &client).await {
                    Ok(_) => {
                        api_success = true;
                        break;
                    },
                    Err(e) => {
                        println!("[DEBUG] API call failed for {}: {}", variant, e);
                    }
                }
            }
            
            if api_success {
                // Verificar después del intento de obtener datos
                let check_row2 = client.query_one(check_sql, &[&ticker]).await?;
                let total_records2: i64 = check_row2.get("total_records");
                let min_date2: Option<NaiveDate> = check_row2.get("min_date");
                let max_date2: Option<NaiveDate> = check_row2.get("max_date");
                println!("[DEBUG] After API call: {} records for {} from {:?} to {:?}", 
                         total_records2, ticker, min_date2, max_date2);
            } else {
                println!("[DEBUG] All API attempts failed for ticker: {}", ticker);
            }
            
            // Usar las fechas solicitadas como fallback
            (requested_start_date, ultimo_dia_habil)
        }
    };

    // Verificar si necesitamos actualizar datos existentes
    if let Some(last_date) = max_date {
        let days_old = (ultimo_dia_habil - last_date).num_days();
        if days_old > 2 {
            // Asegurar que last_date sea un día hábil para la API
            let last_date_habil = get_ultimo_dia_habil(last_date);
            println!("[DEBUG] Data is {} days old, fetching recent data from {} to {}", 
                     days_old, last_date_habil, ultimo_dia_habil);
            let _ = crate::data_bursatil_client::get_intradia_async(&[ticker], &last_date_habil.to_string(), &ultimo_dia_habil.to_string(), &client).await;
        }
    }
    
    // Consulta optimizada usando el intervalo específico detectado
    let sql = r#"
        WITH daily_data AS (
            SELECT fecha_hora::date AS date,
                   fecha_hora,
                   precio,
                   ROW_NUMBER() OVER (PARTITION BY fecha_hora::date ORDER BY fecha_hora DESC) as rn
            FROM intradia_data
            WHERE LOWER(emisora) = LOWER($1) 
                AND fecha_hora::date BETWEEN $2 AND $3
                AND precio > 0  -- Asegurar precios válidos
        )
        SELECT date, precio as close
        FROM daily_data
        WHERE rn = 1  -- Tomar el último precio de cada día (precio de cierre)
        ORDER BY date ASC
    "#;
    
    println!("[DEBUG] Executing optimized query for ticker: {} between {} and {}", 
             ticker, query_start_date, query_end_date);
    let rows = client.query(sql, &[&ticker, &query_start_date, &query_end_date]).await?;
    println!("[DEBUG] Query returned {} rows for {}", rows.len(), ticker);
    
    let mut results = Vec::new();
    
    for row in rows {
        let date: NaiveDate = row.get("date");
        let close: f64 = row.get("close");
        
        results.push(DailyClose { 
            date, 
            close: Some(close)
        });
    }

    // Si no hay datos, mostrar emisoras similares disponibles
    if results.is_empty() {
        println!("[DEBUG] No data found in optimal range. Checking available emisoras...");
        let emisoras_sql = r#"
            SELECT DISTINCT emisora, 
                   COUNT(*) as records,
                   MIN(fecha_hora::date) as first_date,
                   MAX(fecha_hora::date) as last_date
            FROM intradia_data 
            WHERE emisora ILIKE $1 
                AND precio > 0
            GROUP BY emisora 
            ORDER BY records DESC 
            LIMIT 10
        "#;
        let like_pattern = format!("%{}%", ticker);
        let emisoras_rows = client.query(emisoras_sql, &[&like_pattern]).await?;
        
        println!("[DEBUG] Similar emisoras found:");
        for row in emisoras_rows {
            let emisora: String = row.get("emisora");
            let records: i64 = row.get("records");
            let first_date: Option<NaiveDate> = row.get("first_date");
            let last_date: Option<NaiveDate> = row.get("last_date");
            println!("[DEBUG]   - {} ({} records, {:?} to {:?})", emisora, records, first_date, last_date);
        }
    }

    println!("[DEBUG] Returning {} valid data points for ticker: {} in range {} to {}", 
             results.len(), ticker, query_start_date, query_end_date);
    
    Ok(results)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetsDetails {
    pub finantial_flow: std::collections::HashMap<String, f64>,
    pub finantial_position: std::collections::HashMap<String, f64>,
    pub quarter_result: std::collections::HashMap<String, f64>,
    pub trimestres_disponibles: Vec<String>,
}

pub async fn get_assets_details(
    pool: &Pool,
    emisora: &str,
    trimestre: Option<&str>
) -> Result<AssetsDetails, Box<dyn std::error::Error>> {
    let trimestre_actual = trimestre.unwrap_or("1T_2025");
    
    let finantial_flow = get_finantial_flow(pool, emisora, trimestre_actual).await?;
    let finantial_position = get_finantial_position(pool, emisora, trimestre_actual).await?;
    let quarter_result = get_quarterly_income_statement(pool, emisora, trimestre_actual).await?;
    let trimestres_disponibles = get_trimestres_disponibles(pool, emisora).await?;
    
    Ok(AssetsDetails {
        finantial_flow,
        finantial_position,
        quarter_result,
        trimestres_disponibles,
    })
}

