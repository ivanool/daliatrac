use deadpool_postgres::Pool;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{Datelike, Duration, Local, NaiveDate, Timelike, Weekday};



#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyClose {
    pub date: chrono::NaiveDate,
    pub close: Option<f64>,
}



fn get_ultimo_dia_habil(fecha: NaiveDate) -> NaiveDate {
    match fecha.weekday() {
        Weekday::Sat => fecha - Duration::days(1),
        Weekday::Sun => fecha - Duration::days(2),
        _ => fecha,
    }
}

fn comparar_dias_habiles(meses: i32) -> (NaiveDate, NaiveDate) {
    let ahora = Local::now();
    let mut hoy = ahora.date_naive();
    
    println!("[DEBUG] Hora actual: {} (hora: {})", ahora, ahora.hour());
    println!("[DEBUG] Fecha original hoy: {}", hoy);
    
    // Verifica la hora de corte: si es antes de las 3pm usa el día anterior hábil
    // Si es después de las 3pm, usa el día de hoy
    if ahora.hour() < 15 {
        hoy = hoy - Duration::days(1);
        println!("[DEBUG] Antes de las 3pm, usando día anterior: {}", hoy);
    } else {
        println!("[DEBUG] Después de las 3pm, usando día actual: {}", hoy);
    }
    
    // Ajusta para fin de semana si aplica
    let hoy_habil = get_ultimo_dia_habil(hoy);
    println!("[DEBUG] Último día hábil calculado: {}", hoy_habil);
    
    let mut año = hoy_habil.year();
    let mut mes = hoy_habil.month() as i32 - meses;

    while mes <= 0 {
        mes += 12;
        año -= 1;
    }

    let fecha_pasada = NaiveDate::from_ymd_opt(año, mes as u32, hoy_habil.day())
        .unwrap_or_else(|| NaiveDate::from_ymd_opt(año, mes as u32, 28).unwrap());

    let pasada_habil = get_ultimo_dia_habil(fecha_pasada);
    
    println!("[DEBUG] Fecha pasada calculada ({} meses atrás): {}", meses, pasada_habil);
    println!("[DEBUG] Retornando: hoy_habil={}, pasada_habil={}", hoy_habil, pasada_habil);

    (hoy_habil, pasada_habil)
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

pub async fn historical_data_intradia(
    ticker: &str,
    months: i32,
) -> Result<Vec<DailyClose>, Box<dyn std::error::Error>> {
    let (ultimo_dia_habil, requested_start_date) = comparar_dias_habiles(months);
    println!("[FAST] ultimo dia habil {}", ultimo_dia_habil);
    println!("[FAST] requested start {}", requested_start_date);
    println!(
        "[FAST] Today (business day): {}, Start date (business day): {}",
        ultimo_dia_habil, requested_start_date
    );

    let ticker_with_asterisk = format!("{}*", ticker);
    let ticker_without_asterisk = ticker.replace('*', "");
    let ticker_variations = vec![
        ticker,
        &ticker_with_asterisk,
        &ticker_without_asterisk,
    ];

    for variant in &ticker_variations {
        println!("[FAST] Trying ticker variant: {}", variant);
        match crate::data_bursatil_client::get_intradia_direct(
            &[variant],
            &requested_start_date.to_string(),
            &ultimo_dia_habil.to_string(),
        ).await {
            Ok(data) => {
                if !data.is_empty() {
                    println!("[FAST] Successfully got {} data points for {}", data.len(), variant);
                    return Ok(data);
                } else {
                    println!("[FAST] No data returned for {}", variant);
                }
            },
            Err(e) => println!("[FAST] API failed for {}: {}", variant, e),
        }
    }

    println!("[FAST] All API attempts failed for ticker: {}", ticker);
    Ok(Vec::new())
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

