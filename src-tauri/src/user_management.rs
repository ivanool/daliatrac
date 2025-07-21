use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use deadpool_postgres::Pool;

// Import AppState from lib
use crate::AppState;


#[derive(Serialize, Deserialize, Debug)]
pub struct User {
    pub id: i32,
    pub username: String, // Coincide con la columna 'nombre'
    pub email: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Portfolio {
    pub id: i32,
    pub user_id: i32, // Coincide con 'usuario_id'
    pub name: String, // Coincide con 'nombre'
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UserWithPortfolios {
    pub id: i32,
    pub username: String,
    pub email: Option<String>,
    pub portfolios: Vec<Portfolio>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PortfolioMovement {
    pub id: i32,
    pub portfolio_id: i32,
    pub ticker: String,
    pub quantity: i32,
    pub price: f64,
    pub movement_type: String, // "compra" o "venta"
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PortfolioTransaction {
    pub transaction_id: i32,
    pub portfolio_id: i32,
    pub user_id: i32,
    pub ticker: String,
    pub transaction_type: String, // "BUY", "SELL", etc.
    pub quantity: f64,
    pub price: f64,
    pub transaction_date: chrono::DateTime<chrono::Utc>,
    pub total_amount: f64,
    pub currency: String,
    pub notes: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}



#[tauri::command(async)]
pub async fn create_user(
    username: String, 
    email: Option<String>,
    state: State<'_, AppState>,
) -> Result<User, String> {
    let db_pool = &state.db_pool;
    let client = db_pool.get().await
        .map_err(|e| format!("Error de conexión a la base de datos: {}", e))?;
    let row = client.query_one(
        "INSERT INTO usuarios (nombre, email) VALUES ($1, $2) RETURNING id, nombre as username, email",
        &[&username, &email.as_ref().map(|s| s as &str).unwrap_or("")],
    ).await.map_err(|e| {
        format!("El nombre de usuario o email ya está en uso: {}", e)
    })?;

    Ok(User {
        id: row.get("id"),
        username: row.get("username"),
        email: row.get("email"),
    })
}

#[tauri::command(async)]
pub async fn create_portfolio(
    user_id: i32,
    name: String,
    state: State<'_, AppState>,
) -> Result<Portfolio, String> {
    let db_pool = &state.db_pool;
    let client = db_pool.get().await
        .map_err(|e| format!("Error de conexión a la base de datos: {}", e))?;
    let row = client.query_one(
        "INSERT INTO portafolios (usuario_id, nombre) VALUES ($1, $2) RETURNING id, usuario_id, nombre, created_at",
        &[&user_id, &name],
    ).await.map_err(|e| format!("No se pudo crear el portafolio. Es posible que el nombre ya exista: {}", e))?;

    Ok(Portfolio {
        id: row.get("id"),
        user_id: row.get("usuario_id"),
        name: row.get("nombre"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command(async)]
pub async fn delete_user(
    user_id: i32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db_pool = &state.db_pool;
    let client = db_pool.get().await
        .map_err(|e| format!("Error de conexión a la base de datos: {}", e))?;
    let rows_affected = client.execute(
        "DELETE FROM usuarios WHERE id = $1",
        &[&user_id],
    ).await.map_err(|e| format!("No se pudo borrar el usuario: {}", e))?;
    if rows_affected == 0 {
        Err("No se encontró el usuario para borrar".to_string())
    } else {
        Ok(())
    }
}

#[tauri::command(async)]
pub async fn update_user(
    user_id: i32,
    new_username: Option<String>,
    new_email: Option<String>,
    state: State<'_, AppState>,
) -> Result<User, String> {
    let db_pool = &state.db_pool;
    let client = db_pool.get().await
        .map_err(|e| format!("Error de conexión a la base de datos: {}", e))?;
    // Construir la consulta dinámicamente según los campos a actualizar
    let mut set_clauses = Vec::new();
    let mut params: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = Vec::new();
    let mut idx = 1;

    if let Some(ref username) = new_username {
        set_clauses.push(format!("nombre = ${}", idx));
        params.push(username);
        idx += 1;
    }
    if let Some(ref email) = new_email {
        set_clauses.push(format!("email = ${}", idx));
        params.push(email);
        idx += 1;
    }
    if set_clauses.is_empty() {
        return Err("No se proporcionaron campos para actualizar".to_string());
    }
    let set_clause = set_clauses.join(", ");
    params.push(&user_id);
    let query = format!(
        "UPDATE usuarios SET {} WHERE id = ${} RETURNING id, nombre as username, email",
        set_clause, idx
    );
    let row = client.query_one(&query, &params).await
        .map_err(|e| format!("No se pudo actualizar el usuario: {}", e))?;
    Ok(User {
        id: row.get("id"),
        username: row.get("username"),
        email: row.get("email"),
    })
}

#[tauri::command(async)]
pub async fn delete_portfolio(
    portfolio_id: i32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db_pool = &state.db_pool;
    let client = db_pool.get().await
        .map_err(|e| format!("Error de conexión a la base de datos: {}", e))?;
    let rows_affected = client.execute(
        "DELETE FROM portafolios WHERE id = $1",
        &[&portfolio_id],
    ).await.map_err(|e| format!("No se pudo borrar el portafolio: {}", e))?;
    if rows_affected == 0 {
        Err("No se encontró el portafolio para borrar".to_string())
    } else {
        Ok(())
    }
}

#[tauri::command(async)]
pub async fn update_portfolio(
    portfolio_id: i32,
    new_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Portfolio, String> {
    let db_pool = &state.db_pool;
    let client = db_pool.get().await
        .map_err(|e| format!("Error de conexión a la base de datos: {}", e))?;
    let mut set_clauses = Vec::new();
    let mut params: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> = Vec::new();
    let mut idx = 1;
    if let Some(ref name) = new_name {
        set_clauses.push(format!("nombre = ${}", idx));
        params.push(name);
        idx += 1;
    }
    if set_clauses.is_empty() {
        return Err("No se proporcionaron campos para actualizar".to_string());
    }
    let set_clause = set_clauses.join(", ");
    params.push(&portfolio_id);
    let query = format!(
        "UPDATE portafolios SET {} WHERE id = ${} RETURNING id, usuario_id, nombre, created_at",
        set_clause, idx
    );
    let row = client.query_one(&query, &params).await
        .map_err(|e| format!("No se pudo actualizar el portafolio: {}", e))?;
    Ok(Portfolio {
        id: row.get("id"),
        user_id: row.get("usuario_id"),
        name: row.get("nombre"),
        created_at: row.get("created_at"),
    })
}

// Internal function for use within the crate (not exposed as Tauri command)
pub async fn list_users_with_portfolios_internal(
    db_pool: Arc<Pool>,
) -> Result<Vec<UserWithPortfolios>, String> {
    let client = db_pool.get().await
        .map_err(|e| format!("Error de conexión a la base de datos: {}", e))?;
    let user_rows = client.query(
        "SELECT id, nombre as username, email FROM usuarios",
        &[],
    ).await.map_err(|e| format!("Error al consultar usuarios: {}", e))?;
    let mut users = Vec::new();
    for user_row in user_rows {
        let user_id: i32 = user_row.get("id");
        let portfolios = client.query(
            "SELECT id, usuario_id as user_id, nombre as name, created_at FROM portafolios WHERE usuario_id = $1",
            &[&user_id],
        ).await.map_err(|e| format!("Error al consultar portafolios para usuario {}: {}", user_id, e))?;
        let portfolios: Vec<Portfolio> = portfolios.into_iter().map(|row| Portfolio {
            id: row.get("id"),
            user_id: row.get("user_id"),
            name: row.get("name"),
            created_at: row.get("created_at"),
        }).collect();
        users.push(UserWithPortfolios {
            id: user_row.get("id"),
            username: user_row.get("username"),
            email: user_row.get("email"),
            portfolios,
        });
    }
    Ok(users)
}

#[tauri::command(async)]
pub async fn list_users_with_portfolios(
    state: State<'_, AppState>,
) -> Result<Vec<UserWithPortfolios>, String> {
    let db_pool = &state.db_pool;
    list_users_with_portfolios_internal(db_pool.clone()).await
}

#[tauri::command(async)]
pub async fn add_portfolio_movement(
    portfolio_id: i32,
    ticker: &str,
    quantity: i32,
    price: f64,
    movement_type: &str, // "BUY" o "SELL"
    db_pool: &Pool,
) -> Result<PortfolioTransaction, String> {
    let client = db_pool.get().await.map_err(|e| format!("Error de conexión: {}", e))?;
    
    // Verificar si el ticker existe en la tabla emisoras
    match ticker_exists_in_emisoras(ticker, &client).await {
        Ok(false) => return Err(format!("El ticker '{}' no existe en la tabla emisoras", ticker)),
        Err(e) => return Err(e),
        Ok(true) => {} // Continue with the transaction
    }
    
    // NOTA: user_id se debe pasar o deducir, aquí se usa 1 como ejemplo
    let user_id = 1;
    let total_amount = price * quantity as f64;
    let currency = "MXN";
    let notes: Option<String> = None;
    
    // Manejar flujo de caja
    println!("[DEBUG] Iniciando manejo de cash flow para portfolio {}, tipo: {}, cantidad: {}", 
             portfolio_id, movement_type, total_amount);
    
    if let Err(e) = handle_cash_flow(&client, portfolio_id, movement_type, ticker, total_amount).await {
        println!("[ERROR] Error en flujo de caja: {}", e);
        return Err(format!("Error en flujo de caja: {}", e));
    }
    
    println!("[DEBUG] Cash flow completado exitosamente, procediendo con transacción principal");
    
    // Convert to f64 for PostgreSQL DECIMAL compatibility
    let quantity_f64 = quantity as f64;
    let total_amount_f64 = total_amount;
    
    let row = client.query_one(
        "INSERT INTO portfolio_transactions (portfolio_id, user_id, ticker, transaction_type, quantity, price, total_amount, currency, notes, transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now()) RETURNING transaction_id, portfolio_id, user_id, ticker, transaction_type, quantity, price, transaction_date, total_amount, currency, notes, created_at, updated_at",
        &[&portfolio_id, &user_id, &ticker.to_string(), &movement_type.to_string(), &quantity_f64, &price, &total_amount_f64, &currency.to_string(), &notes],
    ).await.map_err(|e| {
        println!("[ERROR] Error al insertar transacción principal: {}", e);
        format!("Error al agregar movimiento: {}", e)
    })?;
    
    println!("[DEBUG] Transacción agregada exitosamente: {} {} de {} a {}", 
             movement_type, quantity, ticker, price);
    
    Ok(PortfolioTransaction {
        transaction_id: row.get("transaction_id"),
        portfolio_id: row.get("portfolio_id"),
        user_id: row.get("user_id"),
        ticker: row.get("ticker"),
        transaction_type: row.get("transaction_type"),
        quantity: row.get("quantity"),
        price: row.get("price"),
        transaction_date: row.get("transaction_date"),
        total_amount: row.get("total_amount"),
        currency: row.get("currency"),
        notes: row.get("notes"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[tauri::command(async)]
pub async fn list_portfolio_movements(
    portfolio_id: i32,
    db_pool: std::sync::Arc<deadpool_postgres::Pool>,
) -> Result<Vec<PortfolioTransaction>, String> {
    let client = db_pool.get().await.map_err(|e| format!("Error de conexión: {}", e))?;
    let rows = client.query(
        "SELECT transaction_id, portfolio_id, user_id, ticker, transaction_type, quantity, price, transaction_date, total_amount, currency, notes, created_at, updated_at FROM portfolio_transactions WHERE portfolio_id = $1 AND transaction_type IN ('BUY', 'SELL') ORDER BY transaction_date ASC",
        &[&portfolio_id],
    ).await.map_err(|e| format!("Error al listar movimientos: {}", e))?;
    Ok(rows.into_iter().map(|row| PortfolioTransaction {
        transaction_id: row.get("transaction_id"),
        portfolio_id: row.get("portfolio_id"),
        user_id: row.get("user_id"),
        ticker: row.get("ticker"),
        transaction_type: row.get("transaction_type"),
        quantity: row.get("quantity"),
        price: row.get("price"),
        transaction_date: row.get("transaction_date"),
        total_amount: row.get("total_amount"),
        currency: row.get("currency"),
        notes: row.get("notes"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }).collect())
}

#[tauri::command]
pub async fn add_portfolio_transaction(
    portfolio_id: i32,
    user_id: i32,
    ticker: &str,
    transaction_type: &str, // "BUY" o "SELL"
    quantity: f64,
    price: f64,
    total_amount: f64,
    currency: &str,
    notes: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<PortfolioTransaction, String> {
    let client = state.db_pool.get().await.map_err(|e| format!("Error de conexión: {}", e))?;
    let row = client.query_one(
        "INSERT INTO portfolio_transactions (portfolio_id, user_id, ticker, transaction_type, quantity, price, total_amount, currency, notes, transaction_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now()) RETURNING transaction_id, portfolio_id, user_id, ticker, transaction_type, quantity, price, transaction_date, total_amount, currency, notes, created_at, updated_at",
        &[&portfolio_id, &user_id, &ticker.to_string(), &transaction_type.to_string(), &quantity, &price, &total_amount, &currency.to_string(), &notes],
    ).await.map_err(|e| format!("Error al agregar transacción: {}", e))?;
    Ok(PortfolioTransaction {
        transaction_id: row.get("transaction_id"),
        portfolio_id: row.get("portfolio_id"),
        user_id: row.get("user_id"),
        ticker: row.get("ticker"),
        transaction_type: row.get("transaction_type"),
        quantity: row.get("quantity"),
        price: row.get("price"),
        transaction_date: row.get("transaction_date"),
        total_amount: row.get("total_amount"),
        currency: row.get("currency"),
        notes: row.get("notes"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

#[tauri::command(async)]
pub async fn list_portfolio_transactions(
    portfolio_id: i32,
    db_pool: std::sync::Arc<deadpool_postgres::Pool>,
) -> Result<Vec<PortfolioTransaction>, String> {
    let client = db_pool.get().await.map_err(|e| format!("Error de conexión: {}", e))?;
    let rows = client.query(
        "SELECT transaction_id, portfolio_id, user_id, ticker, transaction_type, quantity, price, transaction_date, total_amount, currency, notes, created_at, updated_at FROM portfolio_transactions WHERE portfolio_id = $1 ORDER BY transaction_date ASC",
        &[&portfolio_id],
    ).await.map_err(|e| format!("Error al listar transacciones: {}", e))?;
    Ok(rows.into_iter().map(|row| PortfolioTransaction {
        transaction_id: row.get("transaction_id"),
        portfolio_id: row.get("portfolio_id"),
        user_id: row.get("user_id"),
        ticker: row.get("ticker"),
        transaction_type: row.get("transaction_type"),
        quantity: row.get("quantity"),
        price: row.get("price"),
        transaction_date: row.get("transaction_date"),
        total_amount: row.get("total_amount"),
        currency: row.get("currency"),
        notes: row.get("notes"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }).collect())
}

// Function to handle cash flow for portfolio transactions
async fn handle_cash_flow(
    client: &deadpool_postgres::Object,
    portfolio_id: i32,
    transaction_type: &str,
    ticker: &str,
    total_amount: f64,
) -> Result<(), String> {
    // Obtener el cash actual del portafolio
    let cash_row = client.query_opt(
        "SELECT SUM(CASE 
                    WHEN transaction_type = 'DEPOSIT' THEN total_amount 
                    WHEN transaction_type = 'WITHDRAWAL' THEN -total_amount 
                    ELSE 0 
                  END) as current_cash
         FROM portfolio_transactions 
         WHERE portfolio_id = $1 AND ticker = 'CASH'",
        &[&portfolio_id],
    ).await.map_err(|e| format!("Error al consultar cash: {}", e))?;
    
    let current_cash = if let Some(row) = cash_row {
        row.get::<_, Option<f64>>("current_cash").unwrap_or(0.0)
    } else {
        0.0 // Si no hay registro de cash, empezar con 0
    };
    
    let new_cash = match transaction_type {
        "BUY" => {
            // Al comprar, reducir cash. Si no hay suficiente, agregar el faltante
            if current_cash >= total_amount {
                current_cash - total_amount
            } else {
                let faltante = total_amount - current_cash;
                println!("[DEBUG] Cash insuficiente. Actual: {}, Necesario: {}, Agregando: {}", 
                         current_cash, total_amount, faltante);
                
                // Registrar el cash adicional como depósito
                client.execute(
                    "INSERT INTO portfolio_transactions (portfolio_id, user_id, ticker, transaction_type, quantity, price, total_amount, currency, notes, transaction_date) 
                     VALUES ($1, 1, 'CASH', 'DEPOSIT', 1, $2, $2, 'MXN', 'Auto-deposit for insufficient cash', now())",
                    &[&portfolio_id, &faltante],
                ).await.map_err(|e| format!("Error al agregar depósito automático: {}", e))?;
                
                // El nuevo cash será el total después del depósito menos la compra
                let cash_after_deposit = current_cash + faltante;
                cash_after_deposit - total_amount
            }
        },
        "SELL" => {
            // Al vender, aumentar cash
            current_cash + total_amount
        },
        _ => return Err(format!("Tipo de transacción desconocido: {}", transaction_type)),
    };
    
    // Registrar el nuevo estado del cash como depósito/retiro según corresponda
    let (cash_transaction_type, cash_notes) = match transaction_type {
        "BUY" => ("WITHDRAWAL", format!("Cash withdrawal for {} purchase", ticker)),
        "SELL" => ("DEPOSIT", format!("Cash deposit from {} sale", ticker)),
        _ => return Err(format!("Tipo de transacción desconocido: {}", transaction_type)),
    };
    
    // Solo registrar la transacción de cash si el monto es mayor a 0
    if new_cash.abs() > 0.01 { // Usar tolerancia para flotantes
        client.execute(
            "INSERT INTO portfolio_transactions (portfolio_id, user_id, ticker, transaction_type, quantity, price, total_amount, currency, notes, transaction_date) 
             VALUES ($1, 1, 'CASH', $2, 1, $3, $3, 'MXN', $4, now())",
            &[&portfolio_id, &cash_transaction_type, &new_cash.abs(), &cash_notes],
        ).await.map_err(|e| format!("Error al actualizar cash: {}", e))?;
    }
    
    println!("[DEBUG] Cash flow: {} {} -> Cash: {} -> {}", transaction_type, total_amount, current_cash, new_cash);
    
    Ok(())
}

// Function to check if a ticker exists in the emisoras table
pub async fn ticker_exists_in_emisoras(ticker: &str, client: &deadpool_postgres::Object) -> Result<bool, String> {
    let query = "SELECT 1 FROM emisoras WHERE emisoras = $1 OR (emisoras || serie) = $1 LIMIT 1";
    
    match client.query_opt(query, &[&ticker]).await {
        Ok(Some(_)) => Ok(true),
        Ok(None) => {
            // Si no existe, buscar tickers similares para ayudar al usuario
            let similar_query = "SELECT emisoras, serie, (emisoras || serie) as full_ticker FROM emisoras WHERE emisoras ILIKE $1 OR (emisoras || serie) ILIKE $1 LIMIT 5";
            let pattern = format!("%{}%", ticker);
            
            match client.query(similar_query, &[&pattern]).await {
                Ok(rows) => {
                    if !rows.is_empty() {
                        println!("[DEBUG] Ticker '{}' not found. Similar tickers:", ticker);
                        for row in rows {
                            let emisora: String = row.get("emisoras");
                            let serie: Option<String> = row.get("serie");
                            let full_ticker: String = row.get("full_ticker");
                            println!("[DEBUG]   - {} (emisora: {}, serie: {:?})", full_ticker, emisora, serie);
                        }
                        Err(format!("El ticker '{}' no existe. Tickers similares encontrados en logs.", ticker))
                    } else {
                        Err(format!("El ticker '{}' no existe en la tabla emisoras", ticker))
                    }
                },
                Err(e) => Err(format!("Error buscando tickers similares: {}", e)),
            }
        },
        Err(e) => Err(format!("Error checking ticker in emisoras: {}", e)),
    }
}

// Tauri command wrapper for add_portfolio_movement
#[tauri::command]
pub async fn add_portfolio_movement_command(
    portfolio_id: i32,
    ticker: String,
    quantity: i32,
    price: f64,
    movement_type: String,
    state: tauri::State<'_, AppState>,
) -> Result<PortfolioTransaction, String> {
    add_portfolio_movement(
        portfolio_id,
        &ticker,
        quantity,
        price,
        &movement_type,
        &state.db_pool,
    ).await
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TickerInfo {
    pub ticker: String,
    pub emisora: String,
    pub serie: Option<String>,
}

// Tauri command to search for valid tickers
#[tauri::command]
pub async fn search_valid_tickers(
    query: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<TickerInfo>, String> {
    let client = state.db_pool.get().await.map_err(|e| format!("Error de conexión: {}", e))?;
    
    let search_query = "SELECT emisoras, serie, (emisoras || COALESCE(serie, '')) as full_ticker 
                       FROM emisoras 
                       WHERE emisoras ILIKE $1 OR (emisoras || COALESCE(serie, '')) ILIKE $1 
                       ORDER BY emisoras, serie 
                       LIMIT 20";
    let pattern = format!("%{}%", query);
    
    let rows = client.query(search_query, &[&pattern]).await
        .map_err(|e| format!("Error buscando tickers: {}", e))?;
    
    let tickers: Vec<TickerInfo> = rows.into_iter().map(|row| {
        TickerInfo {
            ticker: row.get("full_ticker"),
            emisora: row.get("emisoras"),
            serie: row.get("serie"),
        }
    }).collect();
    
    Ok(tickers)
}

// Tauri command to get current cash for a portfolio
#[tauri::command]
pub async fn get_portfolio_cash(
    portfolio_id: i32,
    state: tauri::State<'_, AppState>,
) -> Result<f64, String> {
    let client = state.db_pool.get().await.map_err(|e| format!("Error de conexión: {}", e))?;
    
    let cash_row = client.query_opt(
        "SELECT SUM(CASE 
                    WHEN transaction_type = 'DEPOSIT' THEN total_amount 
                    WHEN transaction_type = 'WITHDRAWAL' THEN -total_amount 
                    ELSE 0 
                  END) as current_cash
         FROM portfolio_transactions 
         WHERE portfolio_id = $1 AND ticker = 'CASH'",
        &[&portfolio_id],
    ).await.map_err(|e| format!("Error al consultar cash: {}", e))?;
    
    let current_cash = if let Some(row) = cash_row {
        row.get::<_, Option<f64>>("current_cash").unwrap_or(0.0)
    } else {
        0.0
    };
    
    Ok(current_cash)
}


