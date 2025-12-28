/* game.js - Versió completa per substituir l'antic fitxer
   Implementa:
   - Opció 2: les línies no mostren si són pista fins que l'usuari fa clic
   - Historial per fer undo quan es clica una línia genèrica
   - Render de noms en núvols
   - Scroll independent (reset scroll a start i a end)
   - Controls de vídeo: playVideo, togglePlay
   - Carrega de data/joc.json i inicialització
*/

/* ---------- Estat global ---------- */
let data = null;

let video = null;
let lyricsDiv = null;
let tuDiv = null;
let joDiv = null;

let tuNames = [];
let joNames = [];
let historyStack = []; // per undo

/* ---------- Evitar que el touch dins #lyrics faci moure la pàgina (iOS / mòbil) ---------- */
function enableLyricsTouchLock() {
  const el = document.getElementById('lyrics');
  if (!el) return;

  let startY = 0;

  el.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches.length === 1) {
      startY = e.touches[0].clientY;
    }
  }, { passive: true });

  el.addEventListener('touchmove', function(e) {
    if (!e.touches || e.touches.length !== 1) return;
    const currentY = e.touches[0].clientY;
    const atTop = el.scrollTop === 0;
    const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
    const isScrollingUp = currentY > startY;
    const isScrollingDown = currentY < startY;

    // Si estem al límit i intenten seguir fent scroll cap a fora, prevenir la propagació
    if ((atTop && isScrollingUp) || (atBottom && isScrollingDown)) {
      e.preventDefault();
    }

    startY = currentY;
  }, { passive: false });
}

/* ---------- Inicialització DOM i càrrega JSON ---------- */
document.addEventListener("DOMContentLoaded", () => {
  video = document.getElementById("video");
  lyricsDiv = document.getElementById("lyrics");
  tuDiv = document.getElementById("tu-names");
  joDiv = document.getElementById("jo-names");

  // Permetre scroll global mentre estem a la pantalla d'inici
  document.documentElement.style.overflow = 'auto';
  document.body.style.overflow = 'auto';

  // Activem el bloqueig tàctil per la columna de lletra
  enableLyricsTouchLock();

  // Quan acabi el vídeo, passem a la pantalla final
  if (video) {
    video.onended = onVideoEnd;
  }

  // Carreguem el JSON del joc
  fetch("data/joc.json")
    .then(res => {
      if (!res.ok) {
        throw new Error("No s'ha pogut carregar data/joc.json");
      }
      return res.json();
    })
    .then(json => {
      data = json;
      inicialitzaJoc();
    })
    .catch(err => {
      console.error("Error carregant el joc:", err);
      alert("Hi ha hagut un problema carregant el joc. Revisa el fitxer joc.json.");
    });

  // Exposem funcions globals per als botons inline
  window.startGame = startGame;
  window.playVideo = playVideo;
  window.togglePlay = togglePlay;
  window.restart = restart;
});

/* ---------- Inicialització del joc ---------- */
function inicialitzaJoc() {
  if (!data) return;

  tuNames = Array.isArray(data.names) ? [...data.names] : [];
  joNames = Array.isArray(data.names) ? [...data.names] : [];
  historyStack = [];

  renderLyrics();
  renderNames();

  // Assegura que els contenidors amb scroll comencin a dalt
  if (lyricsDiv) lyricsDiv.scrollTop = 0;
  const namesContainer = document.querySelector(".names");
  if (namesContainer) namesContainer.scrollTop = 0;

  // Assegura que la columna del vídeo comenci a dalt (evita que el vídeo aparegui tallat)
  const videoContainer = document.querySelector('.video');
  if (videoContainer) {
    // fem-ho en el proper frame per assegurar que el layout ja està calculat
    requestAnimationFrame(() => {
      videoContainer.scrollTop = 0;
      // un petit timeout addicional per dispositius iOS que necessiten reflow
      setTimeout(() => { videoContainer.scrollTop = 0; }, 50);
    });
  }
}

/* ---------- Render lletres (opció 2) ---------- */
function renderLyrics() {
  if (!lyricsDiv || !data || !Array.isArray(data.lyrics)) return;
  lyricsDiv.innerHTML = "";

  data.lyrics.forEach((line, index) => {
    const div = document.createElement("div");
    div.className = "lyric"; // neutre; el tipus es guarda a data-type
    div.dataset.type = line.type || "generic"; // "pista" o "generic"
    div.dataset.index = index;
    div.textContent = line.text || "";

    div.addEventListener("click", () => onLyricClick(line, div));
    lyricsDiv.appendChild(div);
  });
}

/* ---------- Click sobre una línia ---------- */
function onLyricClick(line, element) {
  if (!element || element.classList.contains("used")) return;

  // Marquem com usada (revelat)
  element.classList.add("used");

  // Si és pista, afegim classe extra per estil
  if (line.type === "pista") {
    element.classList.add("pista");
  }

  // Si és genèrica: fem undo (com a mecànica del joc)
  if (line.type === "generic") {
    element.classList.add("generic");
    undo();
    return;
  }

  // Guardem l'estat per poder revertir
  historyStack.push({
    tu: [...tuNames],
    jo: [...joNames]
  });

  // Aplicar eliminacions segons qui (TU o JO)
  if (line.who === "TU") {
    if (Array.isArray(line.elimina) && line.elimina.length > 0) {
      tuNames = tuNames.filter(n => !line.elimina.includes(n));
    }
  } else if (line.who === "JO") {
    if (Array.isArray(line.elimina) && line.elimina.length > 0) {
      joNames = joNames.filter(n => !line.elimina.includes(n));
    }
  }

  renderNames();
}

/* ---------- Undo (revertir última acció) ---------- */
function undo() {
  if (historyStack.length === 0) return;
  const last = historyStack.pop();
  tuNames = Array.isArray(last.tu) ? last.tu : [];
  joNames = Array.isArray(last.jo) ? last.jo : [];
  renderNames();
}

/* ---------- Render noms en núvols ---------- */
function renderNames() {
  if (!tuDiv || !joDiv) return;

  // TU
  tuDiv.innerHTML = "";
  const tuCloud = document.createElement("div");
  tuCloud.className = "cloud";
  tuNames.forEach(name => {
    const span = document.createElement("span");
    span.textContent = name;
    tuCloud.appendChild(span);
  });
  tuDiv.appendChild(tuCloud);

  // JO
  joDiv.innerHTML = "";
  const joCloud = document.createElement("div");
  joCloud.className = "cloud";
  joNames.forEach(name => {
    const span = document.createElement("span");
    span.textContent = name;
    joCloud.appendChild(span);
  });
  joDiv.appendChild(joCloud);
}

/* ---------- Controls de vídeo ---------- */
function playVideo() {
  if (!video) return;
  const p = video.play();
  if (p && p.then) {
    p.catch(err => {
      // Errors d'autoplay o permisos; només loguem
      console.warn("Video play failed:", err);
    });
  }
}

function togglePlay() {
  if (!video) return;
  if (video.paused) {
    playVideo();
  } else {
    video.pause();
  }
}

/* ---------- Pantalles i control del flux ---------- */
function startGame() {
  const start = document.getElementById("start-screen");
  const game = document.getElementById("game-screen");
  if (start) start.classList.remove("active");
  if (game) game.classList.add("active");

  // Un cop comença el joc, bloquegem el scroll global perquè les columnes gestionin el seu propi scroll
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

 // --- NUEVO: Forzar recalculo para móviles ---
  window.scrollTo(0, 0);
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 150);
  // ------------------------------------------

  // Reset estat del joc
  tuNames = Array.isArray(data.names) ? [...data.names] : [];
  joNames = Array.isArray(data.names) ? [...data.names] : [];
  historyStack = [];

  renderNames();
  renderLyrics();

  // Scroll top per a columnes amb scroll
  if (lyricsDiv) lyricsDiv.scrollTop = 0;
  const namesContainer = document.querySelector(".names");
  if (namesContainer) namesContainer.scrollTop = 0;

  // Assegura que la columna del vídeo comenci a dalt (evita que el vídeo aparegui tallat)
  const videoContainer = document.querySelector('.video');
  if (videoContainer) {
    requestAnimationFrame(() => {
      videoContainer.scrollTop = 0;
      setTimeout(() => { videoContainer.scrollTop = 0; }, 50);
    });
  }
}

/* ---------- Quan el vídeo acaba ---------- */
function onVideoEnd() {
  const game = document.getElementById("game-screen");
  const end = document.getElementById("end-screen");

  // Permetre scroll global a la pantalla final
  document.documentElement.style.overflow = 'auto';
  document.body.style.overflow = 'auto';

  if (game) game.classList.remove("active");
  if (end) end.classList.add("active");

  // Assegura que la pantalla final comenci a dalt (per poder veure el botó)
  const endScreen = document.getElementById("end-screen");
  if (endScreen) endScreen.scrollTop = 0;

  const endText = document.getElementById("end-text");
  if (!endText) return;

  if (
    tuNames.length === 1 &&
    joNames.length === 1 &&
    tuNames[0] !== joNames[0]
  ) {
    endText.innerHTML =
      "<h2>Tu, que esperes esperant<br>i Jo que espero anant anant!</h2>";
  } else {
    endText.innerHTML =
      "<h2>No està resolt encara.<br>Torna-ho a intentar.</h2>";
  }
}

/* ---------- Reinici ---------- */
function restart() {
  // Reinici senzill: recarrega la pàgina per assegurar estat net
  location.reload();
}

/* ---------- Permetre scroll global quan es fa scroll sobre la columna .video ---------- */
(function enableVideoGlobalScroll() {
  const videoCol = document.querySelector('.video');
  if (!videoCol) return;

  let restoreTimer = null;

  function enableBodyScrollTemporarily() {
    // Activa scroll global temporalment
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    // Restablir després d'un curt període sense interacció
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }, 300); // 300ms després de l'últim esdeveniment
  }

  // Roda del ratolí (PC)
  videoCol.addEventListener('wheel', (e) => {
    // Si la roda mou verticalment, volem que la pàgina global es desplaci
    if (Math.abs(e.deltaY) > 0) {
      // Evitem que el comportament intern del contenidor interfereixi
      e.preventDefault();
      enableBodyScrollTemporarily();
      // Esperem un frame perquè Safari re-pinte i accepti el scroll global
      requestAnimationFrame(() => {
        window.scrollBy({ top: e.deltaY, left: 0, behavior: 'auto' });
      });
    }
  }, { passive: false });

  // Touch (mòbil): calculem el delta i fem scroll global
  let touchStartY = null;
  videoCol.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  videoCol.addEventListener('touchmove', (e) => {
    if (!e.touches || e.touches.length !== 1 || touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const delta = touchStartY - currentY;
    if (Math.abs(delta) > 2) {
      // Evitem que el contenidor local intenti gestionar el touch
      e.preventDefault();
      enableBodyScrollTemporarily();
      // Esperem un frame perquè Safari re-pinte i accepti el scroll global
      requestAnimationFrame(() => {
        window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
      });
      touchStartY = currentY;
    }
  }, { passive: false });

})();

/* ---------- Export per debug ---------- */
window._gameDebug = {
  renderLyrics,
  renderNames,
  undo,
  getState: () => ({ tuNames, joNames, historyStack, data })
};
