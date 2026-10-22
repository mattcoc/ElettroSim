//! ElettroSim desktop (Tauri).
//!
//! Quando c'è connessione la finestra apre il sito, così l'app è sempre aggiornata e funzionano account
//! e Lavora insieme; il service worker del sito ne tiene una copia, quindi si riapre anche offline.
//! Se il sito non si carica entro pochi secondi (mai aperto online, oppure rete assente) la finestra
//! passa alla copia dell'app inclusa nel programma.

use std::collections::HashMap;
use std::io::{ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::webview::DownloadEvent;
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_window_state::StateFlags;

const SITE: &str = "https://mattcoc.github.io/ElettroSim/";
const RELEASES_API: &str = "https://api.github.com/repos/mattcoc/ElettroSim/releases/latest";
const RELEASES_URL: &str = "https://github.com/mattcoc/ElettroSim/releases/latest";
/// Secondi di attesa del sito prima di passare alla copia inclusa.
const SITE_TIMEOUT: u64 = 10;
const LOGIN_TIMEOUT: Duration = Duration::from_secs(5 * 60);

#[derive(Default)]
struct AppState {
    /// la pagina ha segnalato di essere pronta (vale per il caricamento in corso)
    ready: Arc<AtomicBool>,
    /// accesso con Google in attesa nel browser: impostarlo a true lo annulla
    login_cancel: Mutex<Option<Arc<AtomicBool>>>,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct LoginResult {
    id_token: Option<String>,
    access_token: Option<String>,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateInfo {
    current: String,
    latest: String,
    newer: bool,
    url: String,
}

fn local_url() -> url::Url {
    let base = if cfg!(windows) {
        "http://tauri.localhost/index.html"
    } else {
        "tauri://localhost/index.html"
    };
    url::Url::parse(base).expect("URL locale valido")
}

fn random_hex(n: usize) -> String {
    let mut b = vec![0u8; n];
    getrandom::getrandom(&mut b).expect("generatore casuale non disponibile");
    b.iter().map(|x| format!("{x:02x}")).collect()
}

fn focus_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/* ---------- accesso con Google nel browser predefinito ----------
Il programma apre login.html del sito nel browser con una porta locale e un codice casuale; la pagina,
dopo l'accesso con Google, rimanda il token a http://127.0.0.1:porta/done e il programma lo passa all'app. */

fn page(title: &str, text: &str) -> String {
    format!(
        "<!doctype html><meta charset=\"utf-8\"><title>{title}</title><body style=\"font:15px system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;background:#e9edf0;color:#1c2329\"><div style=\"background:#fff;padding:28px 32px;border-radius:14px;text-align:center;max-width:420px\"><h2 style=\"margin:0 0 8px\">{title}</h2><p style=\"margin:0;color:#5d6a75\">{text}</p></div></body>"
    )
}

fn respond(mut s: TcpStream, status: &str, body: &str) {
    let _ = write!(
        s,
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = s.flush();
}

fn read_request_path(s: &mut TcpStream) -> Option<String> {
    s.set_read_timeout(Some(Duration::from_secs(3))).ok()?;
    let mut buf = Vec::with_capacity(4096);
    let mut chunk = [0u8; 4096];
    while buf.len() < 32 * 1024 {
        let n = s.read(&mut chunk).ok()?;
        if n == 0 {
            break;
        }
        buf.extend_from_slice(&chunk[..n]);
        if buf.windows(4).any(|w| w == b"\r\n\r\n") {
            break;
        }
    }
    let req = String::from_utf8_lossy(&buf);
    req.lines()
        .next()?
        .split_whitespace()
        .nth(1)
        .map(str::to_owned)
}

fn wait_login(
    app: &AppHandle,
    listener: TcpListener,
    state: &str,
    cancel: &AtomicBool,
) -> LoginResult {
    let start = Instant::now();
    let fail = |e: &str| LoginResult {
        error: Some(e.into()),
        ..Default::default()
    };
    loop {
        if cancel.load(Ordering::SeqCst) {
            return fail("cancelled");
        }
        if start.elapsed() > LOGIN_TIMEOUT {
            return fail("timeout");
        }
        match listener.accept() {
            Ok((mut s, _)) => {
                let _ = s.set_nonblocking(false);
                let Some(path) = read_request_path(&mut s) else {
                    continue;
                };
                let Ok(u) = url::Url::parse(&format!("http://127.0.0.1{path}")) else {
                    continue;
                };
                if u.path() != "/done" {
                    respond(s, "404 Not Found", "");
                    continue;
                }
                let q: HashMap<String, String> = u.query_pairs().into_owned().collect();
                let id = q.get("id").filter(|v| !v.is_empty());
                if q.get("state").map(String::as_str) != Some(state) || id.is_none() {
                    respond(
                        s,
                        "400 Bad Request",
                        &page("Accesso non valido", "Riprova dal programma ElettroSim."),
                    );
                    continue;
                }
                respond(
                    s,
                    "200 OK",
                    &page(
                        "Accesso completato",
                        "Puoi chiudere questa scheda e tornare a ElettroSim.",
                    ),
                );
                focus_main(app);
                return LoginResult {
                    id_token: id.cloned(),
                    access_token: q.get("at").cloned(),
                    error: None,
                };
            }
            Err(e) if e.kind() == ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(100))
            }
            Err(_) => std::thread::sleep(Duration::from_millis(200)),
        }
    }
}

#[tauri::command]
async fn es_login(app: AppHandle, st: State<'_, AppState>) -> Result<LoginResult, String> {
    let cancel = Arc::new(AtomicBool::new(false));
    if let Some(prev) = st.login_cancel.lock().unwrap().replace(cancel.clone()) {
        prev.store(true, Ordering::SeqCst);
    }
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let state = random_hex(16);
    app.opener()
        .open_url(
            format!("{SITE}login.html?port={port}&state={state}"),
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
    let app2 = app.clone();
    tauri::async_runtime::spawn_blocking(move || wait_login(&app2, listener, &state, &cancel))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn es_login_cancel(st: State<'_, AppState>) {
    if let Some(c) = st.login_cancel.lock().unwrap().take() {
        c.store(true, Ordering::SeqCst);
    }
}

/* ---------- aggiornamenti del programma ---------- */

fn ver_of(s: &str) -> [u64; 3] {
    let mut out = [0u64; 3];
    let digits: String = s.chars().skip_while(|c| !c.is_ascii_digit()).collect();
    for (i, p) in digits
        .split(|c: char| !c.is_ascii_digit())
        .filter(|p| !p.is_empty())
        .take(3)
        .enumerate()
    {
        out[i] = p.parse().unwrap_or(0);
    }
    out
}

fn fetch_update(current: &str) -> Option<UpdateInfo> {
    // usa anche il proxy di sistema, se configurato (variabili HTTPS_PROXY / ALL_PROXY)
    let agent = ureq::AgentBuilder::new()
        .try_proxy_from_env(true)
        .timeout(Duration::from_secs(10))
        .build();
    let j: serde_json::Value = agent
        .get(RELEASES_API)
        .set("Accept", "application/vnd.github+json")
        .set("User-Agent", "ElettroSim-desktop")
        .call()
        .ok()?
        .into_json()
        .ok()?;
    let latest = ver_of(j.get("tag_name")?.as_str()?);
    Some(UpdateInfo {
        current: current.to_owned(),
        latest: format!("{}.{}.{}", latest[0], latest[1], latest[2]),
        newer: latest > ver_of(current),
        url: j
            .get("html_url")
            .and_then(|v| v.as_str())
            .unwrap_or(RELEASES_URL)
            .to_owned(),
    })
}

#[tauri::command]
async fn es_check_update(app: AppHandle) -> Option<UpdateInfo> {
    let current = app.package_info().version.to_string();
    tauri::async_runtime::spawn_blocking(move || fetch_update(&current))
        .await
        .ok()
        .flatten()
}

/* ---------- altri comandi usati dalla pagina ---------- */

#[tauri::command]
fn es_open(app: AppHandle, url: String) -> Result<(), String> {
    let u = url::Url::parse(&url).map_err(|e| e.to_string())?;
    if !matches!(u.scheme(), "http" | "https") {
        return Err("indirizzo non consentito".into());
    }
    app.opener()
        .open_url(u.as_str(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn es_fullscreen(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let full = w.is_fullscreen().unwrap_or(false);
        let _ = w.set_fullscreen(!full);
    }
}

/// La pagina comunica di essere caricata: se è il sito, da ora in poi può aprirsi anche offline.
#[tauri::command]
fn es_ready(app: AppHandle, st: State<'_, AppState>) {
    st.ready.store(true, Ordering::SeqCst);
    let online = app
        .get_webview_window("main")
        .and_then(|w| w.url().ok())
        .map(|u| u.as_str().starts_with(SITE))
        .unwrap_or(false);
    if online {
        if let Some(p) = marker(&app) {
            let _ = std::fs::write(p, b"1");
        }
    }
}

fn marker(app: &AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_data_dir().ok()?;
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join("sito-caricato"))
}

/// Script eseguito in ogni pagina prima del codice dell'app: crea il ponte window.elettroDesktop,
/// apre i link esterni nel browser e aggiunge le scorciatoie del programma.
fn bridge_script(version: &str) -> String {
    format!(
        r#"(function () {{
  if (window.elettroDesktop) return;
  var inv = function (cmd, args) {{ return window.__TAURI_INTERNALS__.invoke(cmd, args || {{}}); }};
  window.elettroDesktop = {{
    version: {version:?}, shell: 'tauri',
    login: function () {{ return inv('es_login'); }},
    cancelLogin: function () {{ return inv('es_login_cancel'); }},
    checkUpdate: function () {{ return inv('es_check_update'); }},
    openExternal: function (url) {{ return inv('es_open', {{ url: String(url) }}); }}
  }};
  var abs = function (u) {{ try {{ return new URL(u, location.href); }} catch (e) {{ return null; }} }};
  window.open = function (u) {{ var x = abs(u); if (x && /^https?:$/.test(x.protocol)) window.elettroDesktop.openExternal(x.href); return null; }};
  document.addEventListener('click', function (e) {{
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download')) return;
    var x = abs(a.getAttribute('href'));
    if (x && /^https?:$/.test(x.protocol) && (a.target === '_blank' || x.origin !== location.origin)) {{ e.preventDefault(); window.elettroDesktop.openExternal(x.href); }}
  }}, true);
  document.addEventListener('keydown', function (e) {{
    if (e.key === 'F11') {{ e.preventDefault(); inv('es_fullscreen'); }}
    else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {{ e.preventDefault(); location.reload(); }}
  }}, true);
  var ready = function () {{ if (document.getElementById('cv') || document.getElementById('go')) inv('es_ready').catch(function () {{}}); }};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
}})();"#
    )
}

fn download_name(p: &std::path::Path) -> String {
    p.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| "ElettroSim-file".into())
}

fn create_main_window(app: &AppHandle) -> tauri::Result<()> {
    let version = app.package_info().version.to_string();
    let first_run = marker(app).map(|p| !p.exists()).unwrap_or(true);
    let site = url::Url::parse(SITE).expect("URL del sito valido");
    let notify_app = app.clone();
    let win = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(site))
        .title("ElettroSim")
        .inner_size(1280.0, 820.0)
        .min_inner_size(380.0, 520.0)
        .initialization_script(bridge_script(&version))
        .on_download(move |_w, ev| {
            match ev {
                // senza una cartella scelta dal sistema, i file esportati vanno in Download
                DownloadEvent::Requested { destination, .. } => {
                    if destination
                        .parent()
                        .map(|p| p.as_os_str().is_empty())
                        .unwrap_or(true)
                    {
                        if let Some(dir) = dirs::download_dir() {
                            *destination = dir.join(download_name(destination));
                        }
                    }
                }
                DownloadEvent::Finished {
                    path,
                    success: true,
                    ..
                } => {
                    let name = path.as_deref().map(download_name).unwrap_or_default();
                    let _ = notify_app
                        .notification()
                        .builder()
                        .title("File salvato")
                        .body(format!("{name} è nella cartella Download."))
                        .show();
                }
                _ => {}
            }
            true
        })
        .build()?;

    // al primo avvio la finestra occupa bene lo schermo; poi dimensione e posizione vengono ricordate
    if first_run {
        if let Ok(Some(m)) = win.current_monitor() {
            let s = m.size().to_logical::<f64>(m.scale_factor());
            if s.width < 1500.0 {
                let _ = win.maximize();
            } else {
                let _ = win.set_size(tauri::LogicalSize::new(
                    (s.width * 0.85).min(1600.0),
                    (s.height * 0.85).min(1000.0),
                ));
                let _ = win.center();
            }
        }
    }

    // se il sito non risponde passa alla copia inclusa nel programma
    let st = app.state::<AppState>();
    let ready = st.ready.clone();
    ready.store(false, Ordering::SeqCst);
    let w2 = win.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(SITE_TIMEOUT));
        if !ready.load(Ordering::SeqCst) {
            let _ = w2.navigate(local_url());
        }
    });
    Ok(())
}

fn notify_update(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(8));
        let current = app.package_info().version.to_string();
        if let Some(u) = fetch_update(&current) {
            if u.newer {
                let _ = app
                    .notification()
                    .builder()
                    .title("Aggiornamento di ElettroSim")
                    .body(format!("È disponibile la versione {} del programma: scaricala da Impostazioni › Aggiornamenti.", u.latest))
                    .show();
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main(app)
        }))
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all() & !StateFlags::VISIBLE)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            es_login,
            es_login_cancel,
            es_check_update,
            es_open,
            es_fullscreen,
            es_ready
        ])
        .setup(|app| {
            create_main_window(app.handle())?;
            notify_update(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("errore all'avvio di ElettroSim");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versioni() {
        assert_eq!(ver_of("v2.0.0"), [2, 0, 0]);
        assert_eq!(ver_of("desktop-1"), [1, 0, 0]);
        assert_eq!(ver_of("1.10.3"), [1, 10, 3]);
        assert!(ver_of("v2.0.1") > ver_of("2.0.0"));
        assert!(ver_of("v1.10.0") > ver_of("1.9.9"));
        assert!(ver_of("v2.0.0") > ver_of("1.1.0"));
    }

    #[test]
    fn script_ponte() {
        let s = bridge_script("2.0.0");
        assert!(s.contains("version: \"2.0.0\""));
        assert!(s.contains("es_ready"));
    }
}
