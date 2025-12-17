let data = null;

let video;
let lyricsDiv;
let tuDiv;
let joDiv;

let tuNames = [];
let joNames = [];
let history = [];

// Carrega el JSON quan el DOM està a punt
document.addEventListener("DOMContentLoaded", () => {
  video = document.getElementById("video");
  lyricsDiv = document.getElementById("lyrics");
  tuDiv = document.getElementById("tu-names");
  joDiv = document.getElementById("jo-names");

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
});

function inicialitzaJoc() {
  // Inicialitza els noms dels núvols
  tuNames = [...data.names];
  joNames = [...data.names];

  history = [];

  renderLyrics();
  renderNames();
}

function playVideo() {
    const v = document.getElementById("video");
    v.play();
}

// --- CONTROL DE PANTALLES I VÍDEO ---

function startGame() {
  document.getElementById("start-screen").classList.remove("active");
  document.getElementById("game-screen").classList.add("active");
  if (video) {
    video.play();
  }
}

function togglePlay() {
  if (!video) return;
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

function activarSo() {
    const v = document.getElementById("video");

    // Hack per iOS
    v.muted = false;
    v.currentTime = v.currentTime + 0.001;

    const playPromise = v.play();

    if (playPromise !== undefined) {
        playPromise.catch(() => {
            // Si falla, tornem a intentar-ho després d’un petit delay
            setTimeout(() => {
                v.play();
            }, 100);
        });
    }
}


// --- LLETRA I CLICS ---

function renderLyrics() {
  lyricsDiv.innerHTML = "";

  data.lyrics.forEach((line, index) => {
    const div = document.createElement("div");
    div.className = "lyric " + line.type; // "generic" o "pista"
    div.textContent = line.text;

    // Guardem la posició per si mai la necessitem
    div.dataset.index = index;

    div.onclick = () => onLyricClick(line, div);
    lyricsDiv.appendChild(div);
  });
}

function onLyricClick(line, element) {
  // Si ja s'ha fet servir, no fem res
  if (element.classList.contains("used")) return;

  element.classList.add("used");

  // Si la frase és genèrica, fem UNDO de l’últim filtratge
  if (line.type === "generic") {
    undo();
    return;
  }

  // Guardem l'estat abans de filtrar (per poder tornar enrere)
  history.push({
    tu: [...tuNames],
    jo: [...joNames]
  });

  // Frase de pista: elimina noms del núvol corresponent
  if (line.who === "TU") {
    tuNames = tuNames.filter(n => !line.elimina.includes(n));
  } else if (line.who === "JO") {
    joNames = joNames.filter(n => !line.elimina.includes(n));
  }

  renderNames();
}

// --- UNDO ---

function undo() {
  if (history.length === 0) return;

  const last = history.pop();
  tuNames = last.tu;
  joNames = last.jo;

  renderNames();
}

// --- NOMS ---

function renderNames() {
  tuDiv.innerHTML = tuNames.map(n => `<span>${n}</span>`).join("");
  joDiv.innerHTML = joNames.map(n => `<span>${n}</span>`).join("");
}

// --- FINAL DEL VÍDEO I REINICI ---

if (!video) {
  // Si encara no s'ha definit (perquè el DOM no estava llest),
  // el capturem a l'esdeveniment DOMContentLoaded (a dalt)
} else {
  video.onended = onVideoEnd;
}

function onVideoEnd() {
  document.getElementById("game-screen").classList.remove("active");
  document.getElementById("end-screen").classList.add("active");

  const endText = document.getElementById("end-text");

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

// Ens assegurem de vincular onended quan el vídeo existeix
document.addEventListener("DOMContentLoaded", () => {
  const vid = document.getElementById("video");
  if (vid) {
    vid.onended = onVideoEnd;
  }
});

function restart() {
  location.reload();
}

// Exposem algunes funcions a l'àmbit global
window.startGame = startGame;
window.togglePlay = togglePlay;
window.restart = restart;
