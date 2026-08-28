#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        // el plano y la orden de compra se guardan con el diálogo de Windows
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // busca versiones nuevas en GitHub Releases y reinicia la app al instalarlas
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("no se pudo arrancar el Constructor de Planos");
}
