<p align="center"><img src="icon.svg" width="72" alt=""></p>

<h1 align="center">ElettroSim</h1>

<p align="center"><b>Disegna e simula schemi elettrici direttamente nel browser, anche da telefono.</b><br>
Impianti civili e industriali, PLC in ladder, GRAFCET, logica digitale e pneumatica.</p>

<p align="center"><a href="https://mattcoc.github.io/ElettroSim/"><b>▶ Apri ElettroSim</b></a></p>

<p align="center"><img src="docs/desktop.png" width="760" alt="ElettroSim su computer"> <img src="docs/mobile.png" width="200" alt="ElettroSim su telefono"></p>

## Cosa puoi fare

- **Disegnare schemi** con oltre 250 simboli: alimentazioni, fusibili, magnetotermici, contattori, relè termici, motori, variatori, pulsanti, sensori, lampade, PLC, ladder, GRAFCET, pneumatica e vista del quadro.
- **Simulare il circuito**: premi *Simula* e aziona pulsanti, interruttori e sensori. I cavi in tensione si colorano, bobine e motori si attivano, temporizzatori e contatori funzionano.
- **Verificare lo schema**: il controllo segnala morsetti scollegati, sigle duplicate, cortocircuiti e altri errori.
- **Più fogli** collegati tra loro: elementi con la stessa sigla lavorano insieme anche su fogli diversi.
- **Esportare** in PDF, PNG o SVG, con cartiglio compilabile.
- **Salvare** nel browser, su file `.json` oppure **nel tuo account Google**, per ritrovare gli schemi su ogni dispositivo.
- **Lavorare in due (o più) sullo stesso schema** in tempo reale: *Lavora insieme* crea un link da mandare ai compagni.
- **Esempi pronti**: avviamento diretto, inversione di marcia, stella-triangolo, PLC, GRAFCET, porte logiche, variatore di frequenza.

## Come si usa

1. Scegli un simbolo dalla libreria **Componenti**: cliccalo e poi clicca sul foglio, oppure trascinalo.
2. Collega i morsetti: clicca su un morsetto e poi su un altro.
3. Dai le sigle nel pannello **Proprietà** (la bobina KM1 comanda tutti i contatti KM1).
4. Premi **Verifica**, poi **Simula**.

Il pulsante **?** (o il tasto F1) apre la guida con tutte le scorciatoie da tastiera. Sul telefono gli strumenti sono nella barra in basso; dal menu del browser puoi scegliere *Aggiungi a schermata Home* per usarla come un'app.

## Usarla offline e sul computer

- **Dal browser**: dopo la prima apertura il sito funziona anche senza connessione. Da *File › Installa l'app* (o dal menu del browser) diventa un'app con la sua icona, su computer e telefono.
- **Versione desktop** per Windows, macOS e Linux: scaricala dalla pagina [Releases](https://github.com/mattcoc/ElettroSim/releases/latest). Con la connessione usa la versione più aggiornata del sito (con account e *Lavora insieme*), senza connessione la copia salvata.

Offline si può disegnare, simulare, salvare nel browser ed esportare. Gli schemi salvati nell'account restano leggibili e i salvataggi partono da soli quando torna la rete; accesso e *Lavora insieme* richiedono la connessione.

## Struttura del progetto

Il sito è pubblicato con GitHub Pages dal branch `main`: ogni push lo aggiorna in un paio di minuti. Non serve nessun passaggio di compilazione.

| Percorso | Contenuto |
| --- | --- |
| `index.html` | Struttura della pagina |
| `css/app.css`, `css/fonts.css` | Stile dell'interfaccia e caratteri |
| `js/config.js` | Configurazione di Firebase |
| `js/util.js` | Utilità comuni e potenziali elettrici |
| `js/symbols.js` | Tutti i simboli: disegno, morsetti, comportamento |
| `js/model.js` | Documento, fogli, geometria, percorsi dei cavi |
| `js/render.js` | Disegno del foglio |
| `js/history.js` | Annulla/Ripeti, salvataggio automatico, validazione |
| `js/sim.js` | Motore di simulazione e GRAFCET |
| `js/editor.js` | Selezione, modifica, mouse, tocco, tastiera, menu contestuale |
| `js/ui.js`, `js/panels.js` | Messaggi, finestre, menu, libreria, pannelli, verifica |
| `js/files.js` | File, esportazioni, account Google |
| `js/coop.js` | Lavora insieme (tempo reale) |
| `js/examples.js`, `js/main.js` | Esempi e avvio |
| `sw.js` | Service worker per l'uso offline (se aggiungi un file, aggiungilo anche qui) |
| `fonts/`, `vendor/` | Caratteri e librerie inclusi (jsPDF, Firebase) |
| `desktop/` | Versione desktop (Electron) |
| `.github/workflows/desktop.yml` | Costruisce e pubblica la versione desktop |

Gli script in `js/` sono normali script del browser caricati in ordine da `index.html` e condividono le stesse variabili globali.

### Pubblicare una nuova versione desktop

Su GitHub vai in *Actions › Versione desktop › Run workflow*, oppure crea un tag `v1.0.1` (*Releases › Draft a new release*). In circa 10 minuti la pagina Releases avrà i file per Windows, macOS e Linux. Per provarla in locale: `cd desktop && npm install && npm start`.

## Configurare gli account Google (Firebase)

Gli account sono già collegati al progetto Firebase `elettrosim-19adf`. Per usare un progetto diverso, o per rifare la configurazione da zero, e permettere agli utenti di accedere con Google e ritrovare schemi e blocchi su qualsiasi dispositivo:

1. Vai su <https://console.firebase.google.com>, crea un progetto (Google Analytics non serve).
2. **Authentication** › Inizia › metodo di accesso **Google** › Attiva › Salva.
3. **Authentication** › Impostazioni › **Domini autorizzati** › aggiungi il dominio del sito, ad esempio `mattcoc.github.io`.
4. **Firestore Database** › Crea database (modalità produzione, scegli una località europea, es. `eur3`).
5. Firestore › **Regole**: incolla queste regole e pubblica. Ogni utente legge e scrive solo i propri dati; gli schemi condivisi (`shared`) sono accessibili solo a chi conosce il link della sessione.
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /shared/{room} {
         allow get, update: if request.auth != null;
         allow create: if request.auth != null && request.resource.data.owner == request.auth.uid;
         allow delete: if request.auth != null && resource.data.owner == request.auth.uid;
         match /people/{uid} {
           allow read: if request.auth != null;
           allow write: if request.auth != null && request.auth.uid == uid;
         }
       }
     }
   }
   ```
6. Impostazioni progetto (ingranaggio) › Le tue app › icona **Web** `</>` › registra l'app e copia l'oggetto `firebaseConfig`.
7. In `index.html` sostituisci `const FIREBASE_CONFIG = null;` con la configurazione copiata, ad esempio:
   ```js
   const FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "tuo-progetto.firebaseapp.com",
     projectId: "tuo-progetto",
     storageBucket: "tuo-progetto.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
   Questi valori non sono segreti: la protezione dei dati è data dalle regole del punto 5.

Dopo il push su `main` compare il pulsante **Accedi** in alto a destra. Gli schemi salvati con *File › Salva nel mio account* si aggiornano poi automaticamente a ogni modifica. Limite: circa 900 kB per schema (le immagini incorporate occupano molto spazio).
