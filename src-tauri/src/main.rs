// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use data_bursatil_client::get_ticker_async;
fn main() {
    
    dalia_trac_lib::run();
}
