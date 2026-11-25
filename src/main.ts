import { aiMove, boardFull, createBoard, place, winnerAt, SIZE, type Move } from './engine';
import './style.css';

type Status = 'playing' | 'playerWin' | 'aiWin' | 'draw';
type Difficulty = 'easy' | 'normal' | 'hard';

const app = document.querySelector<HTMLDivElement>('#app')!;
const RECORD_KEY = 'gomoku-record-v1';
let board = createBoard();
let history: Move[] = [];
let status: Status = 'playing';
let thinking = false;
let difficulty: Difficulty = 'normal';
let cursor = { row: 7, col: 7 };
let record = loadRecord();

function loadRecord() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORD_KEY) || '{}');
    return { win: data.win || 0, lose: data.lose || 0, draw: data.draw || 0 };
  } catch { return { win: 0, lose: 0, draw: 0 }; }
}
function saveRecord() { localStorage.setItem(RECORD_KEY, JSON.stringify(record)); }

function cellSize(): number {
  const w = Math.max(300, Math.min(innerWidth - 40, 560));
  return Math.max(14, Math.floor((w - 32) / (SIZE - 1)));
}

function renderBoard(): string {
  const cell = cellSize();
  const width = cell * (SIZE - 1) + 32;
  const pad = 16;
  const lines: string[] = [];
  for (let i = 0; i < SIZE; i++) {
    const p = pad + i * cell;
    lines.push(`<line x1="${pad}" y1="${p}" x2="${width - pad}" y2="${p}" class="grid"/>`);
    lines.push(`<line x1="${p}" y1="${pad}" x2="${p}" y2="${width - pad}" class="grid"/>`);
  }
  for (const [r, c] of [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]]) {
    lines.push(`<circle cx="${pad + c * cell}" cy="${pad + r * cell}" r="3.5" class="star"/>`);
  }
  const stones: string[] = [];
  for (const move of history) {
    const x = pad + move.col * cell;
    const y = pad + move.row * cell;
    stones.push(`<circle cx="${x}" cy="${y}" r="${cell * 0.42}" class="stone s${move.player}${move === history[history.length - 1] ? ' last' : ''}"/>`);
  }
  const cx = pad + cursor.col * cell;
  const cy = pad + cursor.row * cell;
  return `<svg class="board" width="${width}" height="${width}" role="grid" aria-label="五子棋棋盘">
    <rect width="${width}" height="${width}" rx="10" class="board-bg"/>
    ${lines.join('')}
    ${stones.join('')}
    ${status === 'playing' && board[cursor.row]?.[cursor.col] === 0 ? `<circle cx="${cx}" cy="${cy}" r="${cell * 0.42}" class="cursor"/>` : ''}
    ${history.length === 0 ? `<text x="${width / 2}" y="${width / 2 - 24}" class="empty-hint" text-anchor="middle">黑棋先手</text><text x="${width / 2}" y="${width / 2 + 2}" class="empty-hint small" text-anchor="middle">点击落子或方向键移动后按回车</text>` : ''}
  </svg>`;
}

function statusText(): string {
  if (thinking) return '小熊正在思考…';
  if (status === 'playerWin') return '你连成五子，赢了小熊！';
  if (status === 'aiWin') return '小熊连成五子，这局让它领先。';
  if (status === 'draw') return '棋盘下满了，握手言和。';
  return '轮到你落子，黑棋先行。';
}

function bearMood(): string {
  if (thinking) return '盯紧棋盘中';
  if (status === 'playerWin') return '有点小佩服';
  if (status === 'aiWin') return '悄悄松口气';
  return '陪你慢慢下';
}

function render() {
  app.innerHTML = `
    <main class="wrap">
      <header class="head">
        <div class="brand"><span class="brand-mark" aria-hidden="true">${chessIcon}</span><div><h1>五子棋</h1><small>小熊的棋局 · GOMOKU</small></div></div>
        <div class="score" aria-live="polite"><span>胜 ${record.win}</span><span>负 ${record.lose}</span><span>和 ${record.draw}</span></div>
      </header>
      <section class="game" aria-labelledby="game-title">
        <div class="board-wrap">${renderBoard()}</div>
        <aside class="side">
          <div class="bear-card">
            <img src="./characters/classic.webp" alt="Joke Bear 陪你下棋" width="180" height="180"/>
            <p>${bearMood()}</p>
          </div>
          <div class="panel">
            <p class="status" role="status" aria-live="polite">${statusText()}</p>
            <div class="difficulty" role="group" aria-label="难度">
              ${(['easy', 'normal', 'hard'] as Difficulty[]).map(d => `<button type="button" data-difficulty="${d}" aria-pressed="${d === difficulty}" class="${d === difficulty ? 'on' : ''}">${d === 'easy' ? '轻松' : d === 'normal' ? '均衡' : '认真'}</button>`).join('')}
            </div>
            <div class="actions">
              <button type="button" class="btn" data-action="undo" ${history.length < 2 || thinking ? 'disabled' : ''}>悔棋</button>
              <button type="button" class="btn primary" data-action="restart">重开一局</button>
            </div>
            <p class="hint">方向键移动棋子预览，回车落子；点击交叉点也可以直接落子。</p>
          </div>
        </aside>
      </section>
    </main>`;
  bind();
}

function bind() {
  document.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach(button => {
    button.onclick = () => { if (!thinking) { difficulty = button.dataset.difficulty as Difficulty; render(); } };
  });
  document.querySelector<HTMLButtonElement>('[data-action="restart"]')!.onclick = restart;
  const undo = document.querySelector<HTMLButtonElement>('[data-action="undo"]');
  if (undo) undo.onclick = undoMove;
  const svg = document.querySelector<SVGSVGElement>('.board');
  if (svg) {
    svg.onclick = event => {
      if (thinking || status !== 'playing') return;
      const rect = svg.getBoundingClientRect();
      const cell = cellSize();
      const pad = 16;
      const x = event.clientX - rect.left - pad;
      const y = event.clientY - rect.top - pad;
      const col = Math.round(x / cell);
      const row = Math.round(y / cell);
      if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) play(row, col);
    };
  }
}

function restart() {
  board = createBoard();
  history = [];
  status = 'playing';
  thinking = false;
  cursor = { row: 7, col: 7 };
  render();
}

function undoMove() {
  if (thinking || history.length < 2) return;
  for (let i = 0; i < 2; i++) {
    const move = history.pop();
    if (move) board[move.row][move.col] = 0;
  }
  status = 'playing';
  render();
}

function play(row: number, col: number) {
  if (status !== 'playing' || thinking || !place(board, row, col, 1)) return;
  history.push({ row, col, player: 1 });
  finishTurn();
  if (status === 'playing') aiTurn();
}

function finishTurn() {
  const last = history[history.length - 1];
  if (!last) return;
  const win = winnerAt(board, last.row, last.col);
  if (win === 1) { status = 'playerWin'; record.win++; saveRecord(); }
  else if (win === 2) { status = 'aiWin'; record.lose++; saveRecord(); }
  else if (boardFull(board)) { status = 'draw'; record.draw++; saveRecord(); }
}

function aiTurn() {
  thinking = true;
  render();
  const delay = difficulty === 'easy' ? 420 : difficulty === 'normal' ? 320 : 240;
  setTimeout(() => {
    const randomness = difficulty === 'easy' ? 0.9 : difficulty === 'normal' ? 0.28 : 0.05;
    const move = aiMove(board, 2, randomness);
    if (move && place(board, move.row, move.col, 2)) {
      history.push({ row: move.row, col: move.col, player: 2 });
      cursor = { row: move.row, col: move.col };
    }
    thinking = false;
    finishTurn();
    render();
  }, delay);
}

addEventListener('keydown', event => {
  if (thinking || status !== 'playing') return;
  const key = event.key;
  if (key === 'ArrowUp') { cursor.row = Math.max(0, cursor.row - 1); event.preventDefault(); }
  else if (key === 'ArrowDown') { cursor.row = Math.min(SIZE - 1, cursor.row + 1); event.preventDefault(); }
  else if (key === 'ArrowLeft') { cursor.col = Math.max(0, cursor.col - 1); event.preventDefault(); }
  else if (key === 'ArrowRight') { cursor.col = Math.min(SIZE - 1, cursor.col + 1); event.preventDefault(); }
  else if (key === 'Enter' || key === ' ') { play(cursor.row, cursor.col); event.preventDefault(); }
  else return;
  render();
});

addEventListener('resize', () => render());
const chessIcon = '<svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true"><circle cx="512" cy="512" r="400" fill="none" stroke="currentColor" stroke-width="90"/><circle cx="512" cy="512" r="150"/></svg>';
render();
