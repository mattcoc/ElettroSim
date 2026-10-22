# ElettroSim

Editor e simulatore di schemi elettrici in un unico file (`index.html`).

## Attivare gli account Google (salvataggio online)

Senza configurazione tutto viene salvato solo nel browser. Per permettere agli utenti di accedere con Google e ritrovare schemi e blocchi su qualsiasi dispositivo:

1. Vai su <https://console.firebase.google.com>, crea un progetto (Google Analytics non serve).
2. **Authentication** › Inizia › metodo di accesso **Google** › Attiva › Salva.
3. **Authentication** › Impostazioni › **Domini autorizzati** › aggiungi il dominio del sito, ad esempio `mattcoc.github.io`.
4. **Firestore Database** › Crea database (modalità produzione, scegli una località europea, es. `eur3`).
5. Firestore › **Regole**: incolla queste regole e pubblica. Ogni utente legge e scrive solo i propri dati.
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
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
