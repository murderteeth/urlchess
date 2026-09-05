import { Chess, DEFAULT_POSITION, type Move } from "chess.js";
import { uint8ToBase64url } from "./moves";

function statusText(game: Chess): string {
  const turn = game.turn() === "w" ? "White" : "Black";
  if (game.isCheckmate()) return `${turn === "White" ? "Black" : "White"} wins by checkmate!`;
  if (game.isDraw()) {
    if (game.isStalemate()) return "Draw by stalemate";
    if (game.isThreefoldRepetition()) return "Draw by repetition";
    if (game.isInsufficientMaterial()) return "Draw by insufficient material";
    return "Draw by fifty-move rule";
  }
  return game.isCheck() ? `${turn} is in check` : `${turn} to move`;
}

/** Keep one engine and update URL move indices incrementally, outside React render. */
export class GameSession {
  private game = new Chess();
  private history: Move[] = [];
  private indices: number[] = [];
  private redoStack: { move: Move; index: number }[] = [];
  private shareable = true;

  constructor(pgn?: string) {
    if (pgn) {
      const game = new Chess();
      try {
        game.loadPgn(pgn);
        this.load(game);
      } catch {
        // Invalid input starts a fresh game.
      }
    }
  }

  load(game: Chess) {
    const history = game.history({ verbose: true });
    const start = history[0]?.before ?? game.fen();
    const replay = new Chess(start);
    const indices: number[] = [];
    for (const move of history) {
      indices.push(replay.moves().indexOf(move.san));
      replay.move({ from: move.from, to: move.to, promotion: move.promotion });
    }
    this.game = game;
    this.history = history;
    this.indices = indices;
    this.redoStack = [];
    // The existing URL format only represents games from the standard position.
    this.shareable = start === DEFAULT_POSITION;
  }

  move(from: string, to: string, promotion?: "q" | "r" | "b" | "n"): boolean {
    const legal = this.game.moves();
    let move: Move;
    try {
      move = this.game.move({ from, to, promotion });
    } catch {
      return false;
    }
    this.history.push(move);
    this.indices.push(legal.indexOf(move.san));
    this.redoStack = [];
    return true;
  }

  undo(): boolean {
    if (!this.history.length) return false;
    this.game.undo();
    this.redoStack.push({ move: this.history.pop()!, index: this.indices.pop()! });
    return true;
  }

  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    const { from, to, promotion } = entry.move;
    this.history.push(this.game.move({ from, to, promotion }));
    this.indices.push(entry.index);
    return true;
  }

  undoAll() {
    while (this.undo()) { /* Preserve redo history. */ }
  }

  redoAll() {
    while (this.redo()) { /* Replay in chronological order. */ }
  }

  reset() {
    this.load(new Chess());
  }

  snapshot() {
    return {
      fen: this.game.fen(),
      history: this.history.map((move) => move.san),
      pgn: this.history.length ? this.game.pgn().replace(/\[.*?\]\s*/g, "").trim() : "",
      encoded: this.shareable ? uint8ToBase64url(new Uint8Array(this.indices)) : null,
      legalMoves: this.game.moves({ verbose: true }),
      statusText: statusText(this.game),
      turn: this.game.turn(),
      canUndo: this.history.length > 0,
      canRedo: this.redoStack.length > 0,
    };
  }
}
