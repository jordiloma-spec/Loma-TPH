let data = null;

let video;
let lyricsDiv;
let tuDiv;
let joDiv;

let tuNames = [];
let joNames = [];
let history = [];

// --- INICIALITZACIÓ DEL DOM I DEL VÍDEO ---
document.addEventListener("DOMContentLoaded", () => {
  video = document.getElementById("video");
  lyricsDiv = document.getElementById("lyrics");
  tuDiv = document.getElementById("tu-names");
  joDiv = document.getElementById("jo-names");

  // Quan acabi el vídeo, passem a la pantalla final
  video.onended = onVideoEnd;

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
});

// --- INICIALITZACIÓ DEL JOC ---
function inicialitzaJoc() {
  tuNames = [...data.names];
  joNames = [...data.names];
  history = [];

  renderLyrics();
  renderNames();
}

// --- CONTROL DEL VÍDEO ---

// Botó ▶ Reproduir
function playVideo() {
  video.play();
}

// Botó ▶ / ⏸
function togglePlay() {
  if (!video) return;
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

// --- CONTROL DE PANTALLES ---
function startGame() {
  document.getElementById("start-screen").classList.remove("active");
  document.getElementById("game-screen").classList.add("active");
  // IMPORTANT: NO autoplay aquí
}

// --- LLETRA I CLICS ---
function renderLyrics() {
  lyricsDiv.innerHTML = "";

  data.lyrics.forEach((line, index) => {
    const div = document.createElement("div");
    div.className = "lyric " + line.type;
    div.textContent = line.text;
    div.dataset.index = index;

    div.onclick = () => onLyricClick(line, div);
    lyricsDiv.appendChild(div);
  });
}

function onLyricClick(line, element) {
  if (element.classList.contains("used")) return;

  element.classList.add("used");

  if (line.type === "generic") {
    undo();
    return;
  }

  history.push({
    tu: [...tuNames],
    jo: [...joNames]
  });

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

// --- FINAL DEL VÍDEO ---
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

// --- REINICI ---
function restart() {
  location.reload();
}

// Exposem funcions globals
window.startGame = startGame;
window.togglePlay = togglePlay;
window.playVideo = playVideo;
window.restart = restart;
