fn main() {
    // i comandi dell'app sono permessi esplicitamente (anche alla pagina del sito caricata online)
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "es_login",
            "es_login_cancel",
            "es_check_update",
            "es_open",
            "es_fullscreen",
            "es_ready",
        ]),
    ))
    .expect("errore nella preparazione di Tauri");
}
