export const SIZE = 15;
export type Player = 1 | 2;
export type Cell = 0 | Player;
export type Board = Cell[][];

export interface Move {
  row: number;
  col: number;
  player: Player;
}

export function createBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(0));
}

export function place(board: Board, row: number, col: number, player: Player): boolean {
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE || board[row][col] !== 0) return false;
  board[row][col] = player;
  return true;
}

export function winnerAt(board: Board, row: number, col: number): Player | 0 {
  const player = board[row][col];
  if (!player) return 0;
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
        count++;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (count >= 5) return player;
  }
  return 0;
}

export function boardFull(board: Board): boolean {
  return board.every(row => row.every(cell => cell !== 0));
}

function lineScore(count: number, openEnds: number): number {
  if (count >= 5) return 1_000_000;
  if (count === 4) return openEnds === 2 ? 100_000 : openEnds === 1 ? 10_000 : 0;
  if (count === 3) return openEnds === 2 ? 10_000 : openEnds === 1 ? 1_000 : 0;
  if (count === 2) return openEnds === 2 ? 1_000 : openEnds === 1 ? 100 : 0;
  return openEnds === 2 ? 10 : 0;
}

function evaluatePoint(board: Board, row: number, col: number, player: Player): number {
  if (board[row][col] !== 0) return -1;
  let score = 0;
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    let openEnds = 0;
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
        count++;
        r += dr * sign;
        c += dc * sign;
      }
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === 0) openEnds++;
    }
    score += lineScore(count, openEnds);
  }
  return score;
}

export function aiMove(board: Board, player: Player, randomness = 0.2): { row: number; col: number } | null {
  const opponent: Player = player === 1 ? 2 : 1;
  let bestScore = -1;
  let best: { row: number; col: number } | null = null;
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] !== 0) continue;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) {
        for (let dc = -2; dc <= 2 && !near; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] !== 0) near = true;
        }
      }
      if (!near && board.flat().some(cell => cell !== 0)) continue;
      const attack = evaluatePoint(board, row, col, player);
      const defense = evaluatePoint(board, row, col, opponent);
      let score = attack + defense * 0.9;
      if (randomness > 0) score *= 1 + (Math.random() - 0.5) * randomness;
      if (score > bestScore) {
        bestScore = score;
        best = { row, col };
      }
    }
  }
  return best;
}

export function bestMoveOrder(board: Board, player: Player, limit = 14): { row: number; col: number }[] {
  const opponent: Player = player === 1 ? 2 : 1;
  const moves: { row: number; col: number; score: number }[] = [];
  const occupied = board.flat().some(cell => cell !== 0);
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] !== 0) continue;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) {
        for (let dc = -2; dc <= 2 && !near; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] !== 0) near = true;
        }
      }
      if (!near && occupied) continue;
      const score = evaluatePoint(board, row, col, player) + evaluatePoint(board, row, col, opponent) * 0.9;
      moves.push({ row, col, score });
    }
  }
  return moves.sort((a, b) => b.score - a.score).slice(0, limit);
}
