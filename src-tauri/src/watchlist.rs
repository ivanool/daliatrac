use chrono::{Local,Timelike};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use chrono::NaiveDateTime;
use tauri::Command;


use dotenv::dotenv;
std::env;
use chrono::Datelike;

use tokio_postgres::{Client as AssyncClient};
use reqwest::Client as AssetClient;



pub fn add_asset(emisora: &str){
    println!("Adding asset to watchlist: {}", emisora);

    //verificamos que existe emisora en la db
    
    
    let api_key = data_bursatil_client::get_api_key();
    let Client = AssetClient::new();
    // haz una solicitud a la db para ver si existe la emisora
    let query = format!("SELECT * FROM emisoras WHERE emisora = '{}'", emisora);
    println!("Querying database: {}", query);
    let result = Client.query
        &query,
        &[]
    ).await;



    if query.is_empty() {
        println!("Emisora not found in the database: {}", emisora);
        return;
    }
    else {

    }

}
