/***********************
 * NAME DISPLAY (yours)
 ***********************/
const p1Input = document.getElementById("player1Name");
const p2Input = document.getElementById("player2Name");
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
  h1 && (h1.textContent = name1);
  h2 && (h2.textContent = name2);

  const c1 = document.getElementById("player1HeaderCell");
  const c2 = document.getElementById("player2HeaderCell");
  c1 && (c1.textContent = name1);
  c2 && (c2.textContent = name2);
}

/***********************
 * SCORE HELPERS (yours)
 ***********************/
const toNum = (val) => {
  const n = Number(val);
  return (!val || Number.isNaN(n)) ? 0 : n;
};

function calcTotalForPlayer(playerNum) {
  let total = 0;
  if (playerNum == 1) {
    document.querySelectorAll('.score-input.p1').forEach(inp => total += (toNum(inp.value) || 0));
    const totalField = document.querySelector('.total-input.p1');
    if (totalField) totalField.value = total;
  } else if (playerNum == 2) {
    document.querySelectorAll('.score-input.p2').forEach(inp => total += (toNum(inp.value) || 0));
    const totalField = document.querySelector('.total-input.p2');
    if (totalField) totalField.value = total;
  }
}
function recalcAll() { calcTotalForPlayer(1); calcTotalForPlayer(2); }
document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("score-input")) return;
  const player = e.target.dataset.player;
  (player === "1" || player === "2") ? calcTotalForPlayer(player) : recalcAll();
});

/************************************
 * GOLF GAME ENGINE (new)
 ************************************/
const INCLUDE_JOKERS = true; // set to false to make the deck exactly 52
const ROUNDS_MAX = 9;

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






// Card identifiers 
const SUITS = ["♣","♦","♥","♠"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function cardValue(rank) {
  if (rank === "J" || rank === "Q") return 10;
  if (rank === "K") return 0;
  if (rank === "A") return 1;
  if (rank === "JOKER") return -2;
  return Number(rank); // 2-10
}

function makeDeck(includeJokers=true) {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({
        rank: r,
        suit: s,
        label: `${r}${s}`,
        value: cardValue(r),
        faceUp: false,
        cleared: false
      });
    }
  }
  if (includeJokers) {
    deck.push({ rank:"JOKER", suit:"", label:"Joker", value:-2, faceUp:true, cleared:false });
    deck.push({ rank:"JOKER", suit:"", label:"Joker", value:-2, faceUp:true, cleared:false });
  }
  return deck;
}





function shuffle(a) {
  for (let i=a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealHands() {
  // 6 cards each
  for (let i=0;i<6;i++) {
    state.hands[1][i] = { ...state.deck.pop(), faceUp:false, cleared:false };
    state.hands[2][i] = { ...state.deck.pop(), faceUp:false, cleared:false };
  }
}

/******** UI RENDER ********/
function renderPiles() {
  const drawTop = document.querySelector("#draw-pile .card");
  if (drawTop) { drawTop.textContent = "?"; drawTop.classList.add("back"); drawTop.setAttribute("aria-hidden","true"); }

  const discardStack = document.querySelector("#discard-pile");
  discardStack.innerHTML = "";
  const top = state.discard[state.discard.length-1];
  const face = document.createElement("div");
  face.className = "card face";
  face.textContent = top ? top.label : "—";
  discardStack.appendChild(face);
}

function slotRow(slotIndex) { return Math.floor(slotIndex/2); } // rows: 0,1,2

function renderHands() {
  document.querySelectorAll('.card[data-player][data-slot]').forEach(el => {
    const p = Number(el.dataset.player);
    const idx = Number(el.dataset.slot);
    const card = state.hands[p][idx];

    if (!card || card.cleared) {
      el.textContent = ""; 
      el.className = "card";
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

function renderAll() {
  renderPiles();
  renderHands();
}


/******** ROUND / TURN FLOW ********/
function startGame() {
  displayPlayers();
  startRound(1);
}

function startRound(roundNum) {
  state.round = roundNum;
  state.startingPlayer = (roundNum % 2 === 1) ? 1 : 2; // odd=P1, even=P2
  state.currentPlayer = state.startingPlayer;
  state.phase = "setupFlips";
  state.flipsRemaining = { 1: 2, 2: 2 };
  state.openingRowsFlipped = { 1: new Set(), 2: new Set() };
  state.drawnCard = null;

  state.deck = shuffle(makeDeck(INCLUDE_JOKERS));
  
  state.discard = [];
  dealHands();

  // Turn the first card from stock to start the discard
  state.discard.push(state.deck.pop());

  attachUIHandlersOnce();
  renderAll();
  showStatus(`${getPlayerName(state.currentPlayer)}: flip one card (different rows for your two opening flips).`);
}

function getPlayerName(pn) {
  return (pn === 1 ? (p1Input.value || "Player 1") : (p2Input.value || "Player 2"));
}

function nextPlayer() { state.currentPlayer = (state.currentPlayer === 1 ? 2 : 1); }

/******** Opening flips (must be different rows) ********/
function canFlipDuringSetup(pn, slotIdx) {
  if (state.phase !== "setupFlips") return false;
  if (state.currentPlayer !== pn) return false;
  if (state.flipsRemaining[pn] <= 0) return false;

  const row = slotRow(slotIdx);
  if (state.openingRowsFlipped[pn].has(row)) return false; // cannot flip 2 in the same row in setup
  const card = state.hands[pn][slotIdx];
  return card && !card.faceUp && !card.cleared;
}

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

  // Done with this player's setup flips
  nextPlayer();

  // If both are done, move to normal turns
  if (state.flipsRemaining[1] === 0 && state.flipsRemaining[2] === 0) {
    state.phase = "turns";
    state.currentPlayer = state.startingPlayer;
    showStatus(`${getPlayerName(state.currentPlayer)}'s turn: choose to Flip, Draw→Replace, or Draw→Discard.`);
  } else {
    showStatus(`${getPlayerName(state.currentPlayer)}: flip one card (setup phase).`);
  }
}

/******** Turn actions ********/
function canFlipDuringTurn(pn, slotIdx) {
  if (state.phase !== "turns") return false;
  if (state.currentPlayer !== pn) return false;
  const card = state.hands[pn][slotIdx];
  return card && !card.faceUp && !card.cleared && !state.drawnCard;
}

function flipDuringTurn(pn, slotIdx) {
  if (!canFlipDuringTurn(pn, slotIdx)) return;
  const card = state.hands[pn][slotIdx];
  card.faceUp = true;
  tryRowClear(pn, slotIdx);
  endTurn();
}

/* Draw from source: "stock" or "discard" */
function draw(source) {
  if (state.phase !== "turns") return;
  if (state.drawnCard) return; // already holding a drawn card

  if (source === "stock") {
    if (state.deck.length === 0) reshuffleFromDiscardIntoDeck();
    state.drawnCard = state.deck.pop() || null;
  } else if (source === "discard") {
    state.drawnCard = state.discard.pop() || null;
  }
  renderPiles();
  showStatus(`${getPlayerName(state.currentPlayer)}: click one of your cards to REPLACE it, or click Discard pile to discard the drawn card.`);
}

function reshuffleFromDiscardIntoDeck() {
  // leave top of discard; reshuffle the rest
  if (state.discard.length <= 1) return;
  const top = state.discard.pop();
  state.deck = shuffle(state.discard.splice(0));
  state.discard = [top];
}

/* Replace a personal card with drawn card*/
function tryReplace(pn, slotIdx) {
  if (state.phase !== "turns") return;
  if (state.currentPlayer !== pn) return;
  if (!state.drawnCard) return;

  const outgoing = state.hands[pn][slotIdx];
  if (!outgoing || outgoing.cleared) return;

  // place drawn onto table; outgoing goes to discard
  state.hands[pn][slotIdx] = { ...state.drawnCard, faceUp: true };
  state.discard.push(outgoing);
  state.drawnCard = null;

  renderAll();
  tryRowClear(pn, slotIdx);
  endTurn();
}

/* Discard the drawn card instead of replacing */
function discardDrawn() {
  if (state.phase !== "turns") return;
  if (!state.drawnCard) return;
  state.discard.push(state.drawnCard);
  state.drawnCard = null;
  renderPiles();
  endTurn();
}

/******** Row clearing logic ********/
function tryRowClear(pn, slotIdxJustChanged) {
  // Evaluate the row containing the changed slot
  const row = slotRow(slotIdxJustChanged);
  const a = row*2, b = row*2 + 1;
  const c1 = state.hands[pn][a];
  const c2 = state.hands[pn][b];

  if (!c1 || !c2) return;
  if (c1.cleared || c2.cleared) return;

  // Must both be face up to clear
  if (!(c1.faceUp && c2.faceUp)) return;

  // Clear if ranks match OR either is Joker (wild)
  const matches = (c1.rank === c2.rank) || (c1.rank === "JOKER") || (c2.rank === "JOKER");
  if (matches) {
    c1.cleared = true;
    c2.cleared = true;
    renderHands();
  }
}

/******** End turn / End round ********/
function endTurn() {
  // Check end-of-round conditions for the player who just acted
  const pn = state.currentPlayer;

  if (playerClearedAllRows(pn) || playerAllFaceUp(pn)) {
    finishRound();
    return;
  }

  nextPlayer();
  showStatus(`${getPlayerName(state.currentPlayer)}'s turn: choose to Flip, Draw→Replace, or Draw→Discard.`);
}

function playerClearedAllRows(pn) {
  // three rows: (0,1), (2,3), (4,5)
  const h = state.hands[pn];
  return [0,2,4].every(rStart => h[rStart]?.cleared && h[rStart+1]?.cleared);
}

function playerAllFaceUp(pn) {
  return state.hands[pn].every(c => c && (c.faceUp || c.cleared));
}

function handScore(pn) {
  return state.hands[pn].reduce((sum, c) => {
    if (!c || c.cleared) return sum;
    return sum + (c.faceUp ? c.value : c.value); // facedown still counts their value at end of round
  }, 0);
}

function finishRound() {
  state.phase = "ended";
  // Tally visible + hidden (hidden still count)
  const p1Score = handScore(1);
  const p2Score = handScore(2);

  // Write into score tracker for this round
  writeRoundScore(1, state.round, p1Score);
  writeRoundScore(2, state.round, p2Score);
  calcTotalForPlayer(1);
  calcTotalForPlayer(2);

  renderAll();
  showStatus(`Round ${state.round} over. ${getPlayerName(1)}: +${p1Score}, ${getPlayerName(2)}: +${p2Score}.`);

  // Next round or game over
  if (state.round < ROUNDS_MAX) {
    // brief delay so players can see results
    setTimeout(() => startRound(state.round + 1), 750);
  } else {
    const t1 = toNum(document.querySelector('.total-input.p1')?.value);
    const t2 = toNum(document.querySelector('.total-input.p2')?.value);
    const loser = (t1 > t2) ? getPlayerName(1) : (t2 > t1 ? getPlayerName(2) : "Tie");
    showStatus(`Game over. Highest points lose. ${loser === "Tie" ? "It's a tie!" : `${loser} loses.`}`);
  }
}

function writeRoundScore(playerNum, roundNum, amount) {
  const sel = `.score-input.${playerNum===1 ? "p1":"p2"}[data-round="${roundNum}"]`;
  const cell = document.querySelector(sel);
  if (cell) cell.value = amount;
}

/********* UI Handlers *********/
let handlersAttached = false;

function attachUIHandlersOnce() {
  if (handlersAttached) return;

  // Click on card slots (both players)
  document.querySelectorAll('.card[data-player][data-slot]').forEach(el => {
    el.addEventListener('click', () => {
      const pn = Number(el.dataset.player);
      const slot = Number(el.dataset.slot);

      if (state.phase === "setupFlips") {
        handleSetupFlip(pn, slot);
        return;
      }

      if (state.phase === "turns") {
        if (state.currentPlayer !== pn) return;

        if (state.drawnCard) {
          // replace flow
          tryReplace(pn, slot);
        } else {
          // flip flow
          flipDuringTurn(pn, slot);
        }
      }
    });
  });

  // Click draw pile (stock)
  const drawPile = document.getElementById("draw-pile");
  drawPile?.addEventListener('click', () => {
    if (state.phase !== "turns") return;
    if (state.drawnCard) return; // already holding
    draw("stock");
  });

  // Click discard pile:
  const discardPile = document.getElementById("discard-pile");
  discardPile?.addEventListener('click', () => {
    if (state.phase !== "turns") return;
    // If holding a drawn card, this click **discards** it
    if (state.drawnCard) {
      discardDrawn();
    } else {
      // Otherwise, draw FROM discard
      draw("discard");
    }
  });

  handlersAttached = true;
}

function showStatus(msg) {
  // quick & dirty: use document.title; swap this for a dedicated status bar if you want
  document.title = `Golf – ${msg}`;
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

