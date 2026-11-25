import { describe, expect, it } from 'vitest';
import { aiMove, boardFull, createBoard, place, winnerAt, SIZE } from './engine';

describe('gomoku engine', () => {
  it('creates an empty 15x15 board', () => {
    const board = createBoard();
    expect(board).toHaveLength(SIZE);
    expect(board[0]).toHaveLength(SIZE);
    expect(board.flat().every(cell => cell === 0)).toBe(true);
  });

  it('places a stone on empty cell and rejects occupied or out of range', () => {
    const board = createBoard();
    expect(place(board, 7, 7, 1)).toBe(true);
    expect(board[7][7]).toBe(1);
    expect(place(board, 7, 7, 2)).toBe(false);
    expect(place(board, -1, 0, 1)).toBe(false);
    expect(place(board, 0, 15, 1)).toBe(false);
  });

  it('detects horizontal five in a row', () => {
    const board = createBoard();
    for (let col = 3; col <= 7; col++) place(board, 5, col, 1);
    expect(winnerAt(board, 5, 5)).toBe(1);
  });

  it('detects vertical five in a row', () => {
    const board = createBoard();
    for (let row = 2; row <= 6; row++) place(board, row, 8, 2);
    expect(winnerAt(board, 4, 8)).toBe(2);
  });

  it('detects diagonal five in a row both directions', () => {
    const board = createBoard();
    for (let i = 0; i < 5; i++) {
      place(board, 3 + i, 3 + i, 1);
      place(board, 9 - i, 3 + i, 2);
    }
    expect(winnerAt(board, 5, 5)).toBe(1);
    expect(winnerAt(board, 7, 5)).toBe(0);
    expect(winnerAt(board, 6, 6)).toBe(1);
  });

  it('detects anti-diagonal five in a row', () => {
    const board = createBoard();
    for (let i = 0; i < 5; i++) place(board, 9 - i, 3 + i, 2);
    expect(winnerAt(board, 7, 5)).toBe(2);
    expect(winnerAt(board, 9, 3)).toBe(2);
  });

  it('does not declare winner for four in a row', () => {
    const board = createBoard();
    for (let col = 3; col <= 6; col++) place(board, 5, col, 1);
    expect(winnerAt(board, 5, 5)).toBe(0);
  });

  it('reports full board only when every cell is filled', () => {
    const board = createBoard();
    expect(boardFull(board)).toBe(false);
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) board[row][col] = ((row + col) % 2 ? 1 : 2) as 1 | 2;
    }
    expect(boardFull(board)).toBe(true);
  });

  it('AI returns a legal move near existing stones and blocks immediate wins', () => {
    const board = createBoard();
    for (let col = 5; col <= 8; col++) place(board, 7, col, 1);
    const move = aiMove(board, 2, 0);
    expect(move).not.toBeNull();
    expect(board[move!.row][move!.col]).toBe(0);
    expect(move!.row === 7 && (move!.col === 4 || move!.col === 9)).toBe(true);
  });

  it('AI takes a winning move when available', () => {
    const board = createBoard();
    for (let col = 5; col <= 8; col++) place(board, 7, col, 2);
    const move = aiMove(board, 2, 0);
    expect(move).not.toBeNull();
    expect(move!.row).toBe(7);
    expect(move!.col === 4 || move!.col === 9).toBe(true);
  });

  it('AI first move is within the board', () => {
    const board = createBoard();
    const move = aiMove(board, 2, 0);
    expect(move).not.toBeNull();
    expect(move!.row).toBeGreaterThanOrEqual(0);
    expect(move!.row).toBeLessThan(SIZE);
    expect(move!.col).toBeGreaterThanOrEqual(0);
    expect(move!.col).toBeLessThan(SIZE);
  });
});
