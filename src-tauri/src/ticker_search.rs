use deadpool_postgres::Pool;
use std::sync::Arc;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct EmisoraBusqueda {
    pub razon_social: String,
    pub emisoras: String,
    pub serie: Option<String>,
    pub ticker: String, // El ticker completo concatenado
}

pub async fn get_ticker_query(query: String, db_pool: Arc<Pool>) -> Result<Vec<EmisoraBusqueda>, String> {
    let client = db_pool.get().await.map_err(|e| e.to_string())?;
    
    let sql = r#"
        SELECT razon_social, emisoras, serie
        FROM emisoras
        WHERE (LOWER(razon_social) LIKE $1 OR LOWER(emisoras) LIKE $1)
          AND estatus = 'ACTIVA'
        ORDER BY razon_social
        LIMIT 20
    "#;
    let pattern = format!("%{}%", query.to_lowercase());
    let rows = client.query(sql, &[&pattern]).await.map_err(|e| e.to_string())?;
    let results = rows
        .into_iter()
        .map(|row| {
            let emisoras: String = row.get(1);
            let serie: Option<String> = row.get(2);
            
            // Concatenar emisoras + serie para formar el ticker completo
            let ticker = match &serie {
                Some(s) if !s.is_empty() => format!("{}{}", emisoras, s),
                _ => emisoras.clone(),
            };
            
            EmisoraBusqueda {
                razon_social: row.get(0),
                emisoras,
                serie,
                ticker,
            }
        })
        .collect();
    Ok(results)
}