import { Chess } from "chess.js";

/**
 * Encode a game's moves as a base64url string of legal-move indices.
 * Each move is stored as its index in the sorted list of legal moves (SAN order).
 */
export function encodeMoves(pgn: string): string {
  if (!pgn) return "";
  const replay = new Chess();
  const source = new Chess();
  source.loadPgn(pgn);
  const history = source.history();

  const bytes: number[] = [];
  for (const san of history) {
    const legal = replay.moves();
    const idx = legal.indexOf(san);
    if (idx === -1) throw new Error(`Illegal move: ${san}`);
    bytes.push(idx);
    replay.move(san);
  }

  return uint8ToBase64url(new Uint8Array(bytes));
}

/**
 * Decode a base64url string of legal-move indices back to a PGN string.
 */
export function decodeMoves(encoded: string): string {
  if (!encoded) return "";
  const bytes = base64urlToUint8(encoded);
  const game = new Chess();

  for (const idx of bytes) {
    const legal = game.moves();
    if (idx >= legal.length) throw new Error(`Invalid move index: ${idx}`);
    game.move(legal[idx]!);
  }

  return game.pgn();
}

export function uint8ToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToUint8(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
