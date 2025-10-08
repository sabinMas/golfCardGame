// ====== Player Name Display (yours, kept) ======
const p1Input = document.getElementById("player1Name");
const p2Input = document.getElementById("player2Name");
const p1Display = document.getElementById("p1Display");
const p2Display = document.getElementById("p2Display");

document.getElementById("startGameBtn").addEventListener("click", displayPlayers);

function displayPlayers() {
  const name1 = p1Input.value || "Player 1"; 
  const name2 = p2Input.value || "Player 2";

  p1Display.textContent = `Player 1: ${name1}`;
  p2Display.textContent = `Player 2: ${name2}`;

  const h1 = document.getElementById("player1Header");
  const h2 = document.getElementById("player2Header");
  h1 && (h1.textContent = name1); 
  h2 && (h2.textContent = name2);

  const c1 = document.getElementById("player1HeaderCell");
  const c2 = document.getElementById("player2HeaderCell");
  c1 && (c1.textContent = name1);
  c2 && (c2.textContent = name2);
}

// ====== Scoring Helpers ======
const toNum = (val) => {
  const n = Number(val);
  return (!val || Number.isNaN(n)) ? 0 : n;
};

// ====== Calculate totals ======
//https://www.w3schools.com/jsref/met_document_queryselectorall.asp
function calcTotalForPlayer(playerNum) {
  let total = 0;

  if (playerNum == 1 || playerNum == "1") {
    const inputs = document.querySelectorAll('.score-input.p1');
    inputs.forEach(inp => { total += (toNum(inp.value) || 0); });

    const totalField = document.querySelector('.total-input.p1');
    if (totalField) totalField.value = total;
  }
  else if (playerNum == 2 || playerNum =="2") {
    const inputs = document.querySelectorAll('.score-input.p2');
    inputs.forEach(inp => { total += (toNum(inp.value) || 0); });

    const totalField = document.querySelector('.total-input.p2');
    if (totalField) totalField.value = total;
  }
}

// Recalculate both
function recalcAll() {
  calcTotalForPlayer(1);
  calcTotalForPlayer(2);
}

// Recalculate when any score box changes
//https://www.w3schools.com/js/js_htmldom_eventlistener.asp 
document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("score-input")) return;

  const player = e.target.dataset.player;
  if (player === "1" || player === "2") {
    calcTotalForPlayer(player);
  } else {
    // Fallback if a data-player is missing
    recalcAll();
  }
});

