use std::sync::Arc;
use tauri::State;
use deadpool_postgres::Pool;
use chrono::NaiveDate;

use crate::portfolio;

#[tauri::command(async)]
pub async fn get_portfolio_summary(
    portfolio_id: i32,
    db_pool: State<'_, Arc<Pool>>,
) -> Result<portfolio::PortfolioSummary, String> {
    portfolio::get_portfolio_summary_logic(portfolio_id, db_pool).await
}

#[tauri::command(async)]
pub async fn add_cash_movement(
    payload: portfolio::AddCashMovementPayload, 
    db_pool: State<'_, Arc<Pool>>,
) -> Result<portfolio::CashFlow, String> {
    portfolio::add_cash_movement_logic(payload, db_pool).await
}

#[tauri::command(async)]
pub async fn add_asset_transaction(
    portfolio_id: i32,
    ticker: String,
    transaction_type: String,
    quantity: f64,
    price: f64,
    transaction_date: NaiveDate,
    use_cash_from_portfolio: bool,
    db_pool: State<'_, Arc<Pool>>,
) -> Result<portfolio::AssetTransaction, String> {
    portfolio::add_asset_transaction_logic(
        portfolio_id,
        ticker,
        transaction_type,
        quantity,
        price,
        transaction_date,
        use_cash_from_portfolio,
        db_pool,
    )
    .await
}

#[tauri::command(async)]
pub async fn delete_transaction(
    transaction_id: i32,
    db_pool: State<'_, Arc<Pool>>,
) -> Result<String, String> {
    portfolio::delete_transaction_logic(transaction_id, db_pool).await
}