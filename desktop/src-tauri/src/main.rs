// Nasconde la finestra della console nei programmi Windows compilati in modalità release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    elettrosim_lib::run()
}
