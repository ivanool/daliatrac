// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use deadpool_postgres::Runtime;
use dotenv::dotenv;
use std::env;
use std::sync::Arc;
use tauri::State;

mod asset_services;
mod assets;
mod user_management;
mod ticker_search;
mod ticker_tape;
mod heapmap;
pub mod data_bursatil_client;

// State para compartir la conexión de base de datos
pub struct AppState {
    pub db_pool: Arc<deadpool_postgres::Pool>,
}

// Comando Tauri para ejecutar las operaciones de prueba
#[tauri::command]
async fn run_demo_operations(state: State<'_, AppState>) -> Result<String, String> {
    let db_pool = &state.db_pool;
    let mut result = String::new();

    let ticker = "IVVPESOISHRS";
    let months = 12;
    
    // Procesar datos históricos inmediatamente
    match assets::historical_data_intradia(ticker, months).await {
        Ok(data) => {
            if let Some(last_close) = data.last() {
                result.push_str(&format!("Ticker: {}\n", ticker));
                result.push_str(&format!("Close price: {}\n", last_close.close.unwrap_or(0.0)));
                result.push_str(&format!("Date: {}\n", last_close.date));
            } else {
                result.push_str(&format!("No data found for {}\n", ticker));
            }
        }
        Err(e) => {
            result.push_str(&format!("Error fetching historical data: {}\n", e));
        }
    }

    // Example flow for user and portfolio management
    let _user_id = 1; // Example user_id
    let portfolio_id = 4; // Using an existing portfolio_id from the database

    // List users and their portfolios
    result.push_str("\n--- Listing Users and Portfolios ---\n");
    match user_management::list_users_with_portfolios_internal(db_pool.clone()).await {
        Ok(users) => {
            for user in users {
                result.push_str(&format!("User ID: {}, Username: {}\n", user.id, user.username));
                for portfolio in user.portfolios {
                    result.push_str(&format!(
                        "  Portfolio ID: {}, Portfolio Name: {}\n",
                        portfolio.id, portfolio.name
                    ));
                }
            }
        }
        Err(e) => result.push_str(&format!("Error listing users with portfolios: {}\n", e)),
    }

    result.push_str("\n--- Registering a BUY movement ---\n");
    match user_management::add_portfolio_movement(
        portfolio_id,
        "AMXB", // Using a Mexican ticker that should exist
        10,
        16.50,
        "BUY",
        db_pool,
    )
    .await
    {
        Ok(id) => result.push_str(&format!("Successfully registered BUY movement with ID: {:?}\n", id)),
        Err(e) => result.push_str(&format!("Error registering BUY movement: {}\n", e)),
    }

    result.push_str("\n--- Registering a SELL movement ---\n");
    match user_management::add_portfolio_movement(
        portfolio_id,
        "WALMEX*", // Using another Mexican ticker that should exist
        5,
        60.0,
        "SELL",
        db_pool,
    )
    .await
    {
        Ok(id) => result.push_str(&format!("Successfully registered SELL movement with ID: {:?}\n", id)),
        Err(e) => result.push_str(&format!("Error registering SELL movement: {}\n", e)),
    }

    result.push_str("\n--- Listing Portfolio Movements ---\n");
    match user_management::list_portfolio_movements(portfolio_id, db_pool.clone()).await {
        Ok(movements) => {
            for movement in movements {
                result.push_str(&format!(
                    "Movement ID: {}, Type: {}, Ticker: {}, Quantity: {}, Price: {}\n",
                    movement.transaction_id,
                    movement.transaction_type,
                    movement.ticker,
                    movement.quantity,
                    movement.price
                ));
            }
        }
        Err(e) => result.push_str(&format!("Error listing movements: {}\n", e)),
    }

    let ticker = "IVVPESOISHRS";
    result.push_str(&format!("\n--- Fetching Financial Data for {} ---\n", ticker));
    
    let client_result = db_pool.get().await;
    if let Err(e) = client_result {
        result.push_str(&format!("Error getting client from pool: {}\n", e));
        return Ok(result);
    }
    let client = client_result.unwrap();

    match asset_services::get_emisora_from_ticker(ticker, &client).await {
        Some(emisora) => {
            result.push_str(&format!("Emisora found: {}\n", emisora));

            match asset_services::get_tipo_valor(&emisora, &client).await {
                Ok(Some(tipo_valor)) => {
                    result.push_str(&format!("Tipo de Valor: {}\n", tipo_valor));
                }
                Ok(None) => {
                    result.push_str(&format!("Tipo de Valor not found for {}\n", emisora));
                }
                Err(e) => {
                    result.push_str(&format!("Error getting Tipo de Valor: {}\n", e));
                }
            }
        }
        None => {
            result.push_str(&format!("Emisora not found for ticker {}\n", ticker));
        }
    }

    Ok(result)
}

#[tauri::command]
async fn get_historical_data(
    ticker: String,
    months: i32,
) -> Result<Vec<assets::DailyClose>, String> {
    match assets::historical_data_intradia(&ticker, months).await {
        Ok(data) => Ok(data),
        Err(e) => Err(format!("Error fetching historical data: {}", e))
    }
}

#[tauri::command]
async fn debug_data_dates(
    ticker: String,
) -> Result<String, String> {
    match assets::historical_data_intradia(&ticker, 12).await {
        Ok(data) => {
            let mut result = String::new();
            result.push_str(&format!("Total records: {}\n", data.len()));
            
            if !data.is_empty() {
                result.push_str(&format!("First date: {}\n", data.first().unwrap().date));
                result.push_str(&format!("Last date: {}\n", data.last().unwrap().date));
                
                // Mostrar las últimas 10 fechas
                result.push_str("\nLast 10 dates:\n");
                for item in data.iter().rev().take(10) {
                    result.push_str(&format!("  {}: {}\n", item.date, item.close.unwrap_or(0.0)));
                }
                
                // Mostrar las primeras 5 fechas
                result.push_str("\nFirst 5 dates:\n");
                for item in data.iter().take(5) {
                    result.push_str(&format!("  {}: {}\n", item.date, item.close.unwrap_or(0.0)));
                }
            }
            
            Ok(result)
        }
        Err(e) => Err(format!("Error fetching data: {}", e))
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct HoldingInfo {
    pub ticker: String,
    pub total_shares: i32,
    pub average_price: f64,
    pub current_price: Option<f64>,
    pub market_value: Option<f64>,
    pub total_cost: f64,
    pub unrealized_pnl: Option<f64>,
    pub unrealized_pnl_percent: Option<f64>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct PortfolioStats {
    pub total_invested: f64,
    pub current_value: f64,
    pub total_pnl: f64,
    pub total_pnl_percent: f64,
    pub cash_balance: f64,
    pub portfolio_value: f64,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct TransactionInfo {
    pub transaction_id: i32,
    pub ticker: String,
    pub transaction_type: String,
    pub quantity: i32,
    pub price: f64,
    pub total_value: f64,
    pub date: String,
}

#[tauri::command]
async fn get_portfolio_holdings(
    portfolio_id: i32,
    state: State<'_, AppState>
) -> Result<Vec<HoldingInfo>, String> {
    let db_pool = &state.db_pool;
    let client = db_pool.get().await.map_err(|e| e.to_string())?;
    
    let query = "
        SELECT 
            ticker,
            SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE -quantity END) as total_shares,
            SUM(CASE WHEN transaction_type = 'BUY' THEN quantity * price ELSE -quantity * price END) as total_cost
        FROM portfolio_transactions 
        WHERE portfolio_id = $1 
        GROUP BY ticker
        HAVING SUM(CASE WHEN transaction_type = 'BUY' THEN quantity ELSE -quantity END) > 0
    ";
    
    let rows = client.query(query, &[&portfolio_id]).await.map_err(|e| e.to_string())?;
    let mut holdings = Vec::new();
    
    for row in rows {
        let ticker: String = row.get(0);
        let total_shares: f64 = row.get(1);
        let total_cost: f64 = row.get(2);
        let average_price = if total_shares > 0.0 { total_cost / total_shares } else { 0.0 };
        
        let current_price = match data_bursatil_client::get_cotizaciones_async(&ticker).await {
            Ok(Some(cotizacion)) => cotizacion.ultimo_precio,
            _ => None,
        };
        
        let market_value = current_price.map(|price| price * total_shares);
        let unrealized_pnl = market_value.map(|mv| mv - total_cost);
        let unrealized_pnl_percent = unrealized_pnl.map(|pnl| if total_cost > 0.0 { (pnl / total_cost) * 100.0 } else { 0.0 });
        
        holdings.push(HoldingInfo {
            ticker,
            total_shares: total_shares as i32,
            average_price,
            current_price,
            market_value,
            total_cost,
            unrealized_pnl,
            unrealized_pnl_percent,
        });
    }
    
    Ok(holdings)
}

#[tauri::command]
async fn get_portfolio_stats(
    portfolio_id: i32,
    state: State<'_, AppState>
) -> Result<PortfolioStats, String> {
    let holdings = get_portfolio_holdings(portfolio_id, state).await?;
    
    let total_invested: f64 = holdings.iter().map(|h| h.total_cost).sum();
    let current_value: f64 = holdings.iter()
        .filter_map(|h| h.market_value)
        .sum();
    let total_pnl = current_value - total_invested;
    let total_pnl_percent = if total_invested > 0.0 { (total_pnl / total_invested) * 100.0 } else { 0.0 };
    
    let cash_balance = 0.0;
    let portfolio_value = current_value + cash_balance;
    
    Ok(PortfolioStats {
        total_invested,
        current_value,
        total_pnl,
        total_pnl_percent,
        cash_balance,
        portfolio_value,
    })
}

#[tauri::command]
async fn get_portfolio_transactions(
    portfolio_id: i32,
    state: State<'_, AppState>
) -> Result<Vec<TransactionInfo>, String> {
    let transactions = user_management::list_portfolio_transactions(portfolio_id, state.db_pool.clone()).await?;
    
    let mut result = Vec::new();
    for transaction in transactions {
        result.push(TransactionInfo {
            transaction_id: transaction.transaction_id,
            ticker: transaction.ticker,
            transaction_type: transaction.transaction_type,
            quantity: transaction.quantity as i32,
            price: transaction.price,
            total_value: transaction.total_amount,
            date: transaction.transaction_date.format("%Y-%m-%d %H:%M:%S").to_string(),
        });
    }
    
    Ok(result)
}

#[tauri::command]
async fn check_portfolio_exists(
    portfolio_id: i32,
    state: State<'_, AppState>
) -> Result<bool, String> {
    let db_pool = &state.db_pool;
    let client = db_pool.get().await.map_err(|e| e.to_string())?;
    
    let query = "SELECT COUNT(*) as count FROM portafolios WHERE id = $1";
    let row = client.query_one(query, &[&portfolio_id]).await.map_err(|e| e.to_string())?;
    let count: i64 = row.get("count");
    
    Ok(count > 0)
}

#[tauri::command]
async fn search_tickers(
    query: String,
    state: State<'_, AppState>
) -> Result<Vec<ticker_search::EmisoraBusqueda>, String> {
    ticker_search::get_ticker_query(query, state.db_pool.clone()).await
}

#[tauri::command]
async fn get_cotizaciones(
    ticker: String,
    state: State<'_, AppState>
) -> Result<Option<data_bursatil_client::Cotizacion>, String> {
    match data_bursatil_client::get_cotizaciones_async(&ticker).await {
        Ok(cotizacion) => Ok(cotizacion),
        Err(e) => Err(format!("Error fetching cotizaciones: {}", e))
    }
}

#[tauri::command]
async fn get_heatmap_data() -> Result<Vec<heapmap::Asset>, String> {
    match heapmap::load_index().await {
        Ok(assets) => Ok(assets),
        Err(e) => Err(format!("Error loading heatmap data: {}", e))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv().ok();

    // Configurar la conexión a la base de datos
    let mut pg_config = deadpool_postgres::Config::new();
    pg_config.host = Some(env::var("DB_HOST").unwrap_or("localhost".to_string()));
    pg_config.port = Some(
        env::var("DB_PORT")
            .unwrap_or("5432".to_string())
            .parse::<u16>()
            .unwrap(),
    );
    pg_config.user = Some(env::var("DB_USER").unwrap_or("postgres".to_string()));
    pg_config.password = Some(env::var("DB_PASSWORD").unwrap_or("".to_string()));
    pg_config.dbname = Some(env::var("DB_NAME").unwrap_or("daliatrac".to_string()));
    
    let pool = pg_config
        .create_pool(Some(Runtime::Tokio1), tokio_postgres::NoTls)
        .expect("Failed to create database pool");
    
    let db_pool = Arc::new(pool);

    tauri::Builder::default()
        .manage(AppState { db_pool })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            run_demo_operations, 
            get_historical_data,
            debug_data_dates, 
            check_portfolio_exists,
            get_portfolio_holdings, 
            get_portfolio_stats, 
            get_portfolio_transactions,
            search_tickers,
            get_cotizaciones,
            get_heatmap_data,
            asset_services::get_asset_details,
            user_management::list_users_with_portfolios,
            user_management::create_user,
            user_management::create_portfolio,
            user_management::add_portfolio_movement_command,
            user_management::add_portfolio_transaction,
            user_management::search_valid_tickers,
            user_management::get_portfolio_cash,
            user_management::update_user,
            user_management::update_portfolio,
            user_management::delete_user,
            user_management::delete_portfolio,
            ticker_tape::get_ticker_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
