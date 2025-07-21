use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use deadpool_postgres::{Pool, Client};
use tauri::State; 


#[derive(Serialize, Deserialize, Debug)]
pub struct Holding {
    pub ticker: String,
    pub quantity: f64,
    pub average_cost: f64,
    pub market_value: f64,
    pub unrealized_pnl: f64,
    pub unrealized_pnl_percent: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PortfolioSummary {
    pub total_value: f64,
    pub total_pnl: f64,
    pub total_pnl_percent: f64,
    pub holdings: Vec<Holding>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CashFlow {
    pub id: i32,
    pub portfolio_id: i32,
    pub flow_type: String,
    pub amount: f64,
    pub flow_date: NaiveDateTime,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AssetTransaction {
    pub id: i32,
    pub portfolio_id: i32,
    pub ticker: String,
    pub transaction_type: String,
    pub quantity: f64,
    pub price: f64,
    pub transaction_date: NaiveDateTime,
}

#[derive(Deserialize)]
pub struct AddCashMovementPayload {
    #[serde(rename = "portfolioId")]
    pub portfolio_id: i32,
    #[serde(rename = "flowType")]
    pub flow_type: String,
    pub amount: f64,
    #[serde(rename = "flowDate")]
    pub flow_date: NaiveDate,
    pub description: String,
}

struct Position {
    quantity: f64,
    total_cost: f64,
}

async fn get_market_price(ticker: &str) -> Result<f64, String> {
    let cotizacion_opt = data_bursatil_client::get_cotizaciones_async(ticker)
        .await
        .map_err(|e| format!("Error al consultar la API de cotizaciones: {}", e))?;

    cotizacion_opt
        .and_then(|cot| cot.ultimo_precio) 
        .ok_or_else(|| format!("No se encontró un precio de mercado para '{}'", ticker)) 
}


async fn calculate_holdings_from_db(
    client: &Client,
    portfolio_id: i32,
) -> Result<HashMap<String, Position>, String> {
    let mut holdings_map: HashMap<String, Position> = HashMap::new();
    let query = "
        SELECT ticker, transaction_type, quantity, price
        FROM portfolio_transactions
        WHERE portfolio_id = $1 AND transaction_type IN ('buy', 'sell')
    ";

    for row in client.query(query, &[&portfolio_id]).await.map_err(|e| e.to_string())? {
        let ticker: String = row.get("ticker");
        let transaction_type: String = row.get("transaction_type");
        let quantity: f64 = row.get("quantity");
        let price: f64 = row.get("price");

        let entry = holdings_map.entry(ticker).or_insert(Position {
            quantity: 0.0,
            total_cost: 0.0,
        });

        match transaction_type.as_str() {
            "buy" => {
                entry.quantity += quantity;
                entry.total_cost += quantity * price;
            }
            "sell" => {
                if entry.quantity.abs() > 1e-6 {
                    let average_cost_before_sell = entry.total_cost / entry.quantity;
                    entry.total_cost -= quantity * average_cost_before_sell;
                }
                entry.quantity -= quantity;
            }
            _ => {}
        }
    }

    holdings_map.retain(|_, pos| pos.quantity > 1e-6);
    Ok(holdings_map)
}

pub async fn get_portfolio_summary_logic(
    portfolio_id: i32,
    db_pool: State<'_, Arc<Pool>>,
) -> Result<PortfolioSummary, String> {
    let client = db_pool.get().await.map_err(|e| e.to_string())?;
    let holdings_map = calculate_holdings_from_db(&client, portfolio_id).await?;

    let mut holdings = Vec::new();
    let mut total_portfolio_value = 0.0;
    let mut total_portfolio_cost_basis = 0.0;

    for (ticker, position) in holdings_map.iter() {
        let market_price = get_market_price(&ticker).await?;
        let market_value = position.quantity * market_price;
        let average_cost = if position.quantity.abs() > 1e-6 { position.total_cost / position.quantity } else { 0.0 };
        let unrealized_pnl = market_value - position.total_cost;
        let unrealized_pnl_percent = if position.total_cost > 0.0 { (unrealized_pnl / position.total_cost) * 100.0 } else { 0.0 };

        holdings.push(Holding {
            ticker: ticker.clone(),
            quantity: position.quantity,
            average_cost,
            market_value,
            unrealized_pnl,
            unrealized_pnl_percent,
        });

        total_portfolio_value += market_value;
        total_portfolio_cost_basis += position.total_cost;
    }

    let total_pnl = total_portfolio_value - total_portfolio_cost_basis;
    let total_pnl_percent = if total_portfolio_cost_basis > 0.0 { (total_pnl / total_portfolio_cost_basis) * 100.0 } else { 0.0 };

    Ok(PortfolioSummary {
        total_value: total_portfolio_value,
        total_pnl,
        total_pnl_percent,
        holdings,
    })
}

pub async fn add_cash_movement_logic(
    payload: AddCashMovementPayload,
    db_pool: State<'_, Arc<Pool>>,
) -> Result<CashFlow, String> {
    if payload.flow_type != "deposit" && payload.flow_type != "withdrawal" {
        return Err("El tipo de flujo debe ser 'deposit' o 'withdrawal'".to_string());
    }
    
    let client = db_pool.get().await.map_err(|e| e.to_string())?;
    let flow_date_dt = payload.flow_date.and_hms_opt(0, 0, 0).unwrap();
    
    let row = client.query_one(
        "INSERT INTO cashflow (portfolio_id, amount, flow_type,  flow_date, description) VALUES ($1, $2, $3, $4, $5) RETURNING id, portfolio_id, flow_type, amount, flow_date, description",
        &[&payload.portfolio_id, &payload.amount, &payload.flow_type, &flow_date_dt, &payload.description]
    ).await.map_err(|e| e.to_string())?;
    
    Ok(CashFlow {
        id: row.get("id"),
        portfolio_id: row.get("portfolio_id"),
        flow_type: row.get("flow_type"),
        amount: row.get("amount"),
        flow_date: row.get("flow_date"),
        description: Some(row.get("description")),
    })
}

pub async fn add_asset_transaction_logic(
    portfolio_id: i32,
    ticker: String,
    transaction_type: String,
    quantity: f64,
    price: f64,
    transaction_date: NaiveDate,
    use_cash_from_portfolio: bool,
    db_pool: State<'_, Arc<Pool>>,
) -> Result<AssetTransaction, String> {
    if transaction_type != "buy" && transaction_type != "sell" {
        return Err("El tipo de transacción debe ser 'buy' o 'sell'".to_string());
    }

    let mut client = db_pool.get().await.map_err(|e| e.to_string())?;
    let tx = client.transaction().await.map_err(|e| e.to_string())?;
    
    let total_cost = quantity * price;

    if use_cash_from_portfolio {
        let balance_rows = tx.query(
            "SELECT flow_type, amount FROM cashflow WHERE portfolio_id = $1",
            &[&portfolio_id]
        ).await.map_err(|e| e.to_string())?;
        
        let balance = balance_rows.iter().fold(0.0, |acc, row| {
            let flow_type: String = row.get("flow_type");
            let amount: f64 = row.get("amount");
            match flow_type.as_str() {
                "deposit" | "sell_proceeds" | "dividend" => acc + amount,
                "withdrawal" | "buy_cost" => acc - amount,
                _ => acc,
            }
        });

        if transaction_type == "buy" && balance < total_cost {
            return Err("Saldo insuficiente para realizar la compra".to_string());
        }
    }

    let transaction_date_dt = transaction_date.and_hms_opt(0, 0, 0).unwrap();
    let row = tx.query_one(
        "INSERT INTO portfolio_transactions (portfolio_id, ticker, transaction_type, quantity, price, transaction_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, portfolio_id, ticker, transaction_type, quantity, price, transaction_date",
        &[&portfolio_id, &ticker, &transaction_type, &quantity, &price, &transaction_date_dt]
    ).await.map_err(|e| e.to_string())?;

    if use_cash_from_portfolio {
        let (flow_type, amount) = match transaction_type.as_str() {
            "buy" => ("buy_cost", total_cost),
            "sell" => ("sell_proceeds", total_cost),
            _ => unreachable!(),
        };
        tx.execute(
            "INSERT INTO cashflow (portfolio_id, flow_type, amount, flow_date, description) VALUES ($1, $2, $3, $4, $5)",
            &[&portfolio_id, &flow_type, &amount, &transaction_date_dt, &Some(format!("{} {}", transaction_type, ticker))]
        ).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(AssetTransaction {
        id: row.get("id"),
        portfolio_id: row.get("portfolio_id"),
        ticker: row.get("ticker"),
        transaction_type: row.get("transaction_type"),
        quantity: row.get("quantity"),
        price: row.get("price"),
        transaction_date: row.get("transaction_date"),
    })
}

pub async fn delete_transaction_logic(
    transaction_id: i32,
    db_pool: State<'_, Arc<Pool>>,
) -> Result<String, String> {
    let mut client = db_pool.get().await.map_err(|e| e.to_string())?;
    let tx = client.transaction().await.map_err(|e| e.to_string())?;

    let transaction_row = tx.query_one(
        "SELECT portfolio_id, transaction_type, quantity, price, transaction_date 
         FROM portfolio_transactions WHERE id = $1",
        &[&transaction_id]
    ).await.map_err(|_| "No se encontró la transacción para eliminar.".to_string())?;

    let portfolio_id: i32 = transaction_row.get("portfolio_id");
    let transaction_type: String = transaction_row.get("transaction_type");
    let quantity: f64 = transaction_row.get("quantity");
    let price: f64 = transaction_row.get("price");
    let transaction_date: NaiveDateTime = transaction_row.get("transaction_date");
    let total_cost = quantity * price;

    let flow_type_to_delete = match transaction_type.as_str() {
        "buy" => "buy_cost",
        "sell" => "sell_proceeds",
        _ => {
            tx.execute(
                "DELETE FROM portfolio_transactions WHERE id = $1",
                &[&transaction_id]
            ).await.map_err(|e| e.to_string())?;
            tx.commit().await.map_err(|e| e.to_string())?;
            return Ok("Transacción (sin cashflow asociado) eliminada correctamente.".to_string());
        }
    };

    tx.execute(
        "DELETE FROM cashflow 
         WHERE portfolio_id = $1 AND flow_type = $2 AND amount = $3 AND flow_date = $4",
        &[&portfolio_id, &flow_type_to_delete, &total_cost, &transaction_date]
    ).await.map_err(|e| format!("Error al revertir el cashflow: {}", e))?;

    let rows_affected = tx.execute(
        "DELETE FROM portfolio_transactions WHERE id = $1",
        &[&transaction_id]
    ).await.map_err(|e| format!("Error al eliminar la transacción: {}", e))?;

    tx.commit().await.map_err(|e| e.to_string())?;

    if rows_affected == 1 {
        Ok("Transacción y su movimiento de efectivo asociado eliminados correctamente.".to_string())
    } else {
        Err("No se encontró la transacción para eliminar (error inesperado).".to_string())
    }
}