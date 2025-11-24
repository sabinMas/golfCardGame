/*
 * Simple Golf Card Game logic for two players.
 *
 * This script handles player name display, score tracking,
 * deck creation and shuffling, dealing cards, drawing from
 * the stock or discard pile, and replacing cards. It also
 * implements basic drag‑and‑drop so that a player can drag
 * a drawn card onto a slot in their hand or onto the discard
 * pile. When a card is placed on a slot, the card that was
 * there goes to the discard pile. When a card is dragged to
 * the discard pile, the drawn card is simply discarded. 
 */

// Player name display elements
const p1Input   = document.getElementById("player1Name");
const p2Input   = document.getElementById("player2Name");
const p1Display = document.getElementById("p1Display");
const p2Display = document.getElementById("p2Display");
document.getElementById("startGameBtn").addEventListener("click", startGame);

function displayPlayers() {
  const name1 = p1Input.value || "Player 1";
  const name2 = p2Input.value || "Player 2";

  p1Display.textContent = `Player 1: ${name1}`;
  p2Display.textContent = `Player 2: ${name2}`;

  const h1 = document.getElementById("player1Header");
  const h2 = document.getElementById("player2Header");
  if (h1) h1.textContent = name1;
  if (h2) h2.textContent = name2;

  const c1 = document.getElementById("player1HeaderCell");
  const c2 = document.getElementById("player2HeaderCell");
  if (c1) c1.textContent = name1;
  if (c2) c2.textContent = name2;
}


function toNum(val) {
  const n = Number(val);
  return !val || Number.isNaN(n) ? 0 : n;
}

function calcTotalForPlayer(playerNum) {
  let total = 0;
  const selector = playerNum === 1 ? ".score-input.p1" : ".score-input.p2";
  document.querySelectorAll(selector).forEach((input) => {
    total += toNum(input.value) || 0;
  });
  const totalField = document.querySelector(
    playerNum === 1 ? ".total-input.p1" : ".total-input.p2"
  );
  if (totalField) totalField.value = total;
}

function recalcAll() {
  calcTotalForPlayer(1);
  calcTotalForPlayer(2);
}

document.addEventListener("input", (e) => {
  const target = e.target;
  if (!target.classList || !target.classList.contains("score-input")) return;
  const player = target.getAttribute("data-player");
  if (player === "1" || player === "2") {
    calcTotalForPlayer(Number(player));
  } else {
    recalcAll();
  }
});

/*
 * Game state and constants
 */
const INCLUDE_JOKERS = true;
const ROUNDS_MAX     = 9;

// A state object to hold all mutable game data. Each key holds
// simple values that are updated as the game progresses.
const state = {
  round: 1,
  currentPlayer: 1,
  startingPlayer: 1,
  phase: "setupFlips",           
  flipsRemaining: { 1: 2, 2: 2 }, 
  openingRowsFlipped: { 1: new Set(), 2: new Set() },
  deck: [],
  discard: [],
  hands: {
    1: new Array(6).fill(null),
    2: new Array(6).fill(null),
  },
  drawnCard: null,                
};


const SUITS = ["♣", "♦", "♥", "♠"];
const RANKS = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
];

/**
 * Convert card rank to its numeric value for scoring.
 * J/Q are worth 10, K is 0, A is 1, jokers are -2.
 */
function cardValue(rank) {
  if (rank === "J" || rank === "Q") return 10;
  if (rank === "K") return 0;
  if (rank === "A") return 1;
  if (rank === "JOKER") return -2;
  return Number(rank);
}

function makeDeck(includeJokers = true) {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({
        rank: r,
        suit: s,
        label: `${r}${s}`,
        value: cardValue(r),
        faceUp: false,
        cleared: false,
      });
    }
  }
  if (includeJokers) {
    // two jokers
    deck.push({
      rank: "JOKER",
      suit: "",
      label: "Joker",
      value: -2,
      faceUp: true,
      cleared: false,
    });
    deck.push({
      rank: "JOKER",
      suit: "",
      label: "Joker",
      value: -2,
      faceUp: true,
      cleared: false,
    });
  }
  return deck;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Deal six cards to each player by popping from the deck. Cards
 * are dealt alternately to players 1 and 2. Each card starts
 * face down and uncleared.
 */
function dealHands() {
  for (let i = 0; i < 6; i++) {
    state.hands[1][i] = { ...state.deck.pop(), faceUp: false, cleared: false };
    state.hands[2][i] = { ...state.deck.pop(), faceUp: false, cleared: false };
  }
}


function renderPiles() {
  const drawTop = document.querySelector("#draw-pile .card");
  if (drawTop) {
    drawTop.textContent = "?";
    drawTop.className = "card back";
    drawTop.setAttribute("aria-hidden", "true");
  }
  const discardStack = document.querySelector("#discard-pile");
  discardStack.innerHTML = "";
  const top = state.discard[state.discard.length - 1];
  const face = document.createElement("div");
  face.className = "card face";
  face.textContent = top ? top.label : "—";
  discardStack.appendChild(face);
}

/**
 * Determine which row a card slot belongs to. Slots are numbered
 * 0–5 and rows are 0–2.
 */
function slotRow(slotIndex) {
  return Math.floor(slotIndex / 2);
}

function renderHands() {
  document.querySelectorAll(".card[data-player][data-slot]").forEach((el) => {
    const pn  = Number(el.dataset.player);
    const idx = Number(el.dataset.slot);
    const card = state.hands[pn][idx];
    if (!card || card.cleared) {
      
      el.textContent = "";
      el.className   = "card";
      el.style.visibility = card && card.cleared ? "hidden" : "visible";
      return;
    }
    el.style.visibility = "visible";
    if (card.faceUp) {
      el.className = "card face";
      el.textContent = card.label;
    } else {
      el.className = "card back";
      el.textContent = "?";
    }
  });
}


function renderDrawnCard() {
  // ensure a container exists in the table top for the drawn card
  let container = document.getElementById("drawn-pile");
  if (!container) {
    container = document.createElement("div");
    container.id = "drawn-pile";
    container.className = "pile";
    // label
    const lbl = document.createElement("div");
    lbl.className = "label";
    lbl.textContent = "Drawn";
    container.appendChild(lbl);
    // stack for the card
    const stack = document.createElement("div");
    stack.className = "stack";
    container.appendChild(stack);
    // append after discard pile
    const tableTop = document.querySelector(".table-top");
    tableTop.appendChild(container);
  }
  const stack = container.querySelector(".stack");
  stack.innerHTML = "";
  if (state.drawnCard) {
    const face = document.createElement("div");
    face.className = "card face";
    face.textContent = state.drawnCard.label;
    // mark as draggable; on dragstart set a dummy dataTransfer value
    face.setAttribute("draggable", "true");
    face.addEventListener("dragstart", (e) => {
      // some browsers require data to be set for drag to start
      e.dataTransfer.setData("text/plain", "drawn");
    });
    stack.appendChild(face);
  } else {
    // leave empty when no card is drawn
    stack.appendChild(document.createElement("div"));
  }
}

/**
 * Render all UI elements (piles, hands, drawn card).
 */
function renderAll() {
  renderPiles();
  renderHands();
  renderDrawnCard();
}

/**
 * Start a new game. This displays player names and begins
 * round 1.
 */
function startGame() {
  displayPlayers();
  startRound(1);
}


function startRound(roundNum) {
  state.round = roundNum;
  // alternate starting player each round
  state.startingPlayer = roundNum % 2 === 1 ? 1 : 2;
  state.currentPlayer  = state.startingPlayer;
  state.phase          = "setupFlips";
  state.flipsRemaining = { 1: 2, 2: 2 };
  state.openingRowsFlipped = { 1: new Set(), 2: new Set() };
  state.drawnCard = null;

  state.deck    = shuffle(makeDeck(INCLUDE_JOKERS));
  state.discard = [];
  dealHands();
  // flip first card of the stock into the discard pile
  state.discard.push(state.deck.pop());

  attachUIHandlersOnce();
  renderAll();
  showStatus(
    `${getPlayerName(state.currentPlayer)}: flip one card (two flips, different rows).`
  );
}


function getPlayerName(pn) {
  return pn === 1 ? p1Input.value || "Player 1" : p2Input.value || "Player 2";
}

/**
 * Switch to the other player's turn.
 */
function nextPlayer() {
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
}

function canFlipDuringSetup(pn, slotIdx) {
  if (state.phase !== "setupFlips") return false;
  if (state.currentPlayer !== pn) return false;
  if (state.flipsRemaining[pn] <= 0) return false;
  const row = slotRow(slotIdx);
  if (state.openingRowsFlipped[pn].has(row)) return false;
  const card = state.hands[pn][slotIdx];
  return card && !card.faceUp && !card.cleared;
}

/**
 * Flip a card during the setup phase. Tracks rows already
 * flipped and advances the game state when all flips are
 * completed.
 */
function handleSetupFlip(pn, slotIdx) {
  if (!canFlipDuringSetup(pn, slotIdx)) return;
  const card = state.hands[pn][slotIdx];
  card.faceUp = true;
  state.openingRowsFlipped[pn].add(slotRow(slotIdx));
  state.flipsRemaining[pn]--;
  renderHands();
  if (state.flipsRemaining[pn] > 0) {
    showStatus(`${getPlayerName(pn)}: flip one more card in a different row.`);
    return;
  }
  // done with this player's flips
  nextPlayer();
  if (state.flipsRemaining[1] === 0 && state.flipsRemaining[2] === 0) {
    state.phase = "turns";
    state.currentPlayer = state.startingPlayer;
    showStatus(
      `${getPlayerName(state.currentPlayer)}'s turn: flip, draw/replace or draw/discard.`
    );
  } else {
    showStatus(`${getPlayerName(state.currentPlayer)}: flip one card (setup phase).`);
  }
}

/**
 * Determine whether a given slot may be flipped during the
 * normal turns phase. Only face‑down, uncleared cards may be
 * flipped and a player may not flip while holding a drawn card.
*/
function canFlipDuringTurn(pn, slotIdx) {
  if (state.phase !== "turns") return false;
  if (state.currentPlayer !== pn) return false;
  const card = state.hands[pn][slotIdx];
  return card && !card.faceUp && !card.cleared && !state.drawnCard;
}

/**
 * Flip a card during the normal turn phase. After flipping
 * a card we check whether the row should be cleared and end
 * the player's turn.
 */
function flipDuringTurn(pn, slotIdx) {
   if (!canFlipDuringTurn(pn, slotIdx)) return;
   const card = state.hands[pn][slotIdx];
   card.faceUp = true;
+  // Re-render the player's hand so the flipped card shows immediately
+  renderHands();
   tryRowClear(pn, slotIdx);
   endTurn();
 }

/**
 * Draw a card from either the stock or discard pile during a normal turn.
 * Places the drawn card into the player's temporary hand, updates the UI,
 * and prompts the player to replace a card or discard the one drawn.
 */
function draw(source) {
  if (state.phase !== "turns") return;
  if (state.drawnCard) return; 
  if (source === "stock") {
    if (state.deck.length === 0) reshuffleFromDiscardIntoDeck();
    state.drawnCard = state.deck.pop() || null;
  } else if (source === "discard") {
    state.drawnCard = state.discard.pop() || null;
  }
  renderAll();
  showStatus(
    `${getPlayerName(state.currentPlayer)}: drag the drawn card onto one of your cards to replace it, or onto the discard pile to discard.`
  );
}

/**
 * Rebuild the draw pile by reshuffling the discard pile when the stock is empty.
 * Keeps the top discard card in place and shuffles the rest back into the deck.
 */
function reshuffleFromDiscardIntoDeck() {
  if (state.discard.length <= 1) return;
  const top = state.discard.pop();
  state.deck = shuffle(state.discard.splice(0));
  state.discard = [top];
}

/**
 * Replace one of the player's cards using the drawn card.
 * Inserts the drawn card face-up into the chosen slot, moves the old card
 * to the discard pile, updates the UI, checks the row for clearing,
 * and ends the player's turn.
 */
function tryReplace(pn, slotIdx) {
  if (state.phase !== "turns") return;
  if (state.currentPlayer !== pn) return;
  if (!state.drawnCard) return;
  const outgoing = state.hands[pn][slotIdx];
  if (!outgoing || outgoing.cleared) return;
  // place drawn card, mark it face up
  state.hands[pn][slotIdx] = { ...state.drawnCard, faceUp: true };
  // outgoing card goes to discard
  state.discard.push(outgoing);
  state.drawnCard = null;
  renderAll();
  tryRowClear(pn, slotIdx);
  endTurn();
}

/**
 * Discard the currently drawn card instead of replacing a slot.
 * Places the drawn card onto the discard pile, clears the held card,
 * updates the UI, and ends the player's turn.
 */
function discardDrawn() {
  if (state.phase !== "turns") return;
  if (!state.drawnCard) return;
  state.discard.push(state.drawnCard);
  state.drawnCard = null;
  renderAll();
  endTurn();
}

/**
 * Check whether both cards in the affected row are face-up and eligible to clear.
 * If the two cards match in rank (or include a joker), both cards are marked
 * as cleared and removed visually from the board.
 */
function tryRowClear(pn, slotIdxJustChanged) {
  const row = slotRow(slotIdxJustChanged);
  const a = row * 2;
  const b = row * 2 + 1;
  const c1 = state.hands[pn][a];
  const c2 = state.hands[pn][b];
  if (!c1 || !c2) return;
  if (c1.cleared || c2.cleared) return;
  if (!c1.faceUp || !c2.faceUp) return;
  const matches =
    c1.rank === c2.rank || c1.rank === "JOKER" || c2.rank === "JOKER";
  if (matches) {
    c1.cleared = true;
    c2.cleared = true;
    renderHands();
  }
}

/**
 * Finish the current player's turn. Checks for end-of-round conditions,
 * switches to the next player if the game continues, and updates the
 * status message to show whose turn is next.
 */
function endTurn() {
  const pn = state.currentPlayer;
  if (playerClearedAllRows(pn) || playerAllFaceUp(pn)) {
    finishRound();
    return;
  }
  nextPlayer();
  showStatus(
    `${getPlayerName(state.currentPlayer)}'s turn: flip, draw/replace or draw/discard.`,
    true 
  );
}


/**
 * Determine whether the player has cleared all three rows.
 * Returns true only if all six cards have been removed from play.
 */
function playerClearedAllRows(pn) {
  const h = state.hands[pn];
  return [0, 2, 4].every((rStart) => h[rStart]?.cleared && h[rStart + 1]?.cleared);
}
/**
 * Check whether the player has revealed every card in their grid.
 * Returns true when all cards are either face-up or already cleared.
 */
function playerAllFaceUp(pn) {
  return state.hands[pn].every((c) => c && (c.faceUp || c.cleared));
}

/**
 * Calculate the player's current hand score by summing all non-cleared cards.
 * Cleared cards contribute nothing; hidden cards still count their value.
 */
function handScore(pn) {
  return state.hands[pn].reduce((sum, c) => {
    if (!c || c.cleared) return sum;
    return sum + c.value;
  }, 0);
}

/**
 * End the current round, compute both players’ scores, update the scoreboard,
 * display the round results, and either start the next round or finish the game.
 */

function finishRound() {
  state.phase = "ended";
  const p1Score = handScore(1);
  const p2Score = handScore(2);
  writeRoundScore(1, state.round, p1Score);
  writeRoundScore(2, state.round, p2Score);
  calcTotalForPlayer(1);
  calcTotalForPlayer(2);
  renderAll();
  showStatus(
    `Round ${state.round} over. ${getPlayerName(1)}: +${p1Score}, ${getPlayerName(2)}: +${p2Score}.`
  );
  if (state.round < ROUNDS_MAX) {
    setTimeout(() => startRound(state.round + 1), 750);
  } else {
    const t1 = toNum(document.querySelector(".total-input.p1")?.value);
    const t2 = toNum(document.querySelector(".total-input.p2")?.value);
    const loser = t1 > t2 ? getPlayerName(1) : t2 > t1 ? getPlayerName(2) : "Tie";
    showStatus(
      `Game over. Highest points lose. ${loser === "Tie" ? "It's a tie!" : `${loser} loses.`}`
    );
  }
}

/**
 * Write an individual player's round score into the score table.
 * Locates the correct input box based on player and round, then inserts the score.
 */
function writeRoundScore(playerNum, roundNum, amount) {
  const selector = `.score-input.${playerNum === 1 ? "p1" : "p2"}[data-round="${roundNum}"]`;
  const cell = document.querySelector(selector);
  if (cell) cell.value = amount;
}

/*
 * User interface handlers
 * Tracks whether all UI event handlers have already been attached.
 * Prevents multiple bindings when rounds restart or the board is re-rendered.
 */

let handlersAttached = false;

/**
 * This attaches all click and drag event handlers for the game's interactive elements.
 * Ensures handlers are only bound a single time, then routes user actions
 * (flips, draws, replacements, discards) based on the current game phase.
 */
function attachUIHandlersOnce() {
  if (handlersAttached) return;
  document.querySelectorAll(".card[data-player][data-slot]").forEach((el) => {
    el.addEventListener("click", () => {
      const pn   = Number(el.dataset.player);
      const slot = Number(el.dataset.slot);
      if (state.phase === "setupFlips") {
        handleSetupFlip(pn, slot);
        return;
      }
      if (state.phase === "turns") {
        if (state.currentPlayer !== pn) return;
        if (state.drawnCard) {
          tryReplace(pn, slot);
        } else {
          flipDuringTurn(pn, slot);
        }
      }
    });
  });
  const drawPile = document.getElementById("draw-pile");
  if (drawPile) {
    drawPile.addEventListener("click", () => {
      if (state.phase !== "turns") return;
      if (state.drawnCard) return;
      draw("stock");
    });
  }
  const discardPile = document.getElementById("discard-pile");
  if (discardPile) {
    discardPile.addEventListener("click", () => {
      if (state.phase !== "turns") return;
      if (state.drawnCard) {
        discardDrawn();
      } else {
        draw("discard");
      }
    });
  }
  addDragHandlers();
  handlersAttached = true;
}

/**
 * This enables drag-and-drop behavior for replacing cards or discarding the drawn card.
 * Card slots accept a drop to perform a replacement, while the discard pile
 * accepts a drop to throw away the drawn card.
 */
function addDragHandlers() {
  // each card slot accepts a drop to replace
  document.querySelectorAll(".card[data-player][data-slot]").forEach((el) => {
    el.addEventListener("dragover", (e) => {
      if (state.drawnCard) e.preventDefault();
    });
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      const pn   = Number(el.dataset.player);
      const slot = Number(el.dataset.slot);
      if (state.drawnCard) tryReplace(pn, slot);
    });
  });
  // the discard pile accepts a drop to discard
  const discardArea = document.getElementById("discard-pile");
  if (discardArea) {
    discardArea.addEventListener("dragover", (e) => {
      if (state.drawnCard) e.preventDefault();
    });
    discardArea.addEventListener("drop", (e) => {
      e.preventDefault();
      if (state.drawnCard) discardDrawn();
    });
  }
}

/**
 * This update the game's status message shown at the top of the UI.
 * Optionally triggers a turn-change animation to highlight whose turn it is.
 * Also updates the page title to reflect the current game state.
 */
function showStatus(msg, isTurnChange = false) {
  document.title = "Golf – " + msg;
  const indicator = document.getElementById("turn-indicator");
  if (indicator) {
    indicator.textContent = msg;

    // Animate turn indicator whenever player's turn changes
    if (isTurnChange) {
      anime({
        targets: indicator,
        boxShadow: [
          "0 0 30px 10px #ffd700",
          "0 0 10px 2px #ffd700"
        ],
        scale: [1, 1.15, 1],
        duration: 900,
        easing: "easeOutElastic(1, .8)"
      });
    } else {
      anime({
        targets: indicator,
        opacity: [0, 1],
        scale: [0.7, 1],
        duration: 600,
        easing: "easeOutElastic(1, .7)"
      });
    }
  }
}

