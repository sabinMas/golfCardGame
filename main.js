// ===== Variables =====
let score = 0;                         // single variable for score
let roundScores = [0, 0, 0, 0, 0];     // array for rounds

// ===== DOM Elements =====
const scoreDisplay = document.getElementById("scoreDisplay");
const scoreArrayDisplay = document.getElementById("scoreArrayDisplay");

const p1Input = document.getElementById("player1Name");
const p2Input = document.getElementById("player2Name");
const p1Display = document.getElementById("p1Display");
const p2Display = document.getElementById("p2Display");

// ===== Event Listeners =====
document.getElementById("startGameBtn").addEventListener("click", displayPlayers);
document.getElementById("increaseScoreBtn").addEventListener("click", increaseScore);
document.getElementById("updateArrayBtn").addEventListener("click", updateArray);

// ===== Functions =====
function displayPlayers() {
  const name1 = p1Input.value || "Player 1";
  const name2 = p2Input.value || "Player 2";

  // under the setup box
  p1Display.textContent = `Player 1: ${name1}`;
  p2Display.textContent = `Player 2: ${name2}`;

  // above each player’s 6 cards
  const h1 = document.getElementById("player1Header");
  const h2 = document.getElementById("player2Header");
  if (h1) h1.textContent = name1;
  if (h2) h2.textContent = name2;

  // score table headers
  const c1 = document.getElementById("player1HeaderCell");
  const c2 = document.getElementById("player2HeaderCell");
  if (c1) c1.textContent = name1;
  if (c2) c2.textContent = name2;
}



function increaseScore() {
  score++;
  scoreDisplay.innerHTML = score; // DOM update
}

function updateArray() {
  // Change a value in the array and update display
  roundScores[0] = Math.floor(Math.random() * 10); // random round 1 score
  scoreArrayDisplay.innerHTML = `[${roundScores.join(", ")}]`;
}
