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
 * Convert a card rank to its numeric value for scoring.
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
 *
 * @param {number} slotIndex
 * @returns {number}
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
  tryRowClear(pn, slotIdx);
  endTurn();
}


function draw(source) {
  if (state.phase !== "turns") return;
  if (state.drawnCard) return; // already holding a card
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
 * Reshuffle all but the top card of the discard pile back into
 * the deck. Leaves the top card in place. Uses the shuffle
 * function described above.
 */
function reshuffleFromDiscardIntoDeck() {
  if (state.discard.length <= 1) return;
  const top = state.discard.pop();
  state.deck = shuffle(state.discard.splice(0));
  state.discard = [top];
}

/**
 * Replace a player's card at the given slot with the drawn card.
 * The outgoing card is put onto the discard pile. After
 * replacement we clear the drawn card state, render, attempt
 * to clear the row, and end the turn.
 *
 * @param {number} pn
 * @param {number} slotIdx
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
 * Discard the drawn card without replacing. Simply push it
 * onto the discard pile and end the turn.
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
 * Evaluate whether a row should be cleared. A row is cleared
 * if both cards in that row are face up and either their ranks
 * match or one of them is a joker. Cleared cards are removed
 * from play (hidden). After clearing, the hands are re-rendered.
 *
 * @param {number} pn
 * @param {number} slotIdxJustChanged
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
 * End the current player's turn. Checks whether the round is
 * finished (all cards cleared or all face up). Writes scores
 * into the scoreboard and either starts the next round or
 * finishes the game.
 */
function endTurn() {
  const pn = state.currentPlayer;
  if (playerClearedAllRows(pn) || playerAllFaceUp(pn)) {
    finishRound();
    return;
  }
  nextPlayer();
  showStatus(
    `${getPlayerName(state.currentPlayer)}'s turn: flip, draw/replace or draw/discard.`
  );
}

/**
 * Determine whether a player has cleared all three rows.
 *
 * @param {number} pn
 * @returns {boolean}
 */
function playerClearedAllRows(pn) {
  const h = state.hands[pn];
  return [0, 2, 4].every((rStart) => h[rStart]?.cleared && h[rStart + 1]?.cleared);
}

/**
 * Determine whether all cards in a player's hand are face up
 * or cleared. Hidden cards still count toward the score if the
 * round ends early.
 *
 * @param {number} pn
 * @returns {boolean}
 */
function playerAllFaceUp(pn) {
  return state.hands[pn].every((c) => c && (c.faceUp || c.cleared));
}


function handScore(pn) {
  return state.hands[pn].reduce((sum, c) => {
    if (!c || c.cleared) return sum;
    return sum + c.value;
  }, 0);
}


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
 * Write a single round score into the scoreboard for a player.
 *
 * @param {number} playerNum
 * @param {number} roundNum
 * @param {number} amount
 */
function writeRoundScore(playerNum, roundNum, amount) {
  const selector = `.score-input.${playerNum === 1 ? "p1" : "p2"}[data-round="${roundNum}"]`;
  const cell = document.querySelector(selector);
  if (cell) cell.value = amount;
}

/*
 * User interface handlers
 */
let handlersAttached = false;

function attachUIHandlersOnce() {
  if (handlersAttached) return;
  // Click on card slots: handle flips and replacements via click
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
  // Click draw pile (stock)
  const drawPile = document.getElementById("draw-pile");
  if (drawPile) {
    drawPile.addEventListener("click", () => {
      if (state.phase !== "turns") return;
      if (state.drawnCard) return;
      draw("stock");
    });
  }
  // Click discard pile
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
  // Drag targets: card slots and discard pile
  addDragHandlers();
  handlersAttached = true;
}


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

function showStatus(msg) {
  document.title = `Golf – ${msg}`;
}
