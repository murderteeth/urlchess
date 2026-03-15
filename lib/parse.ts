import { Chess } from "chess.js";

/**
 * Try to parse a string as chess moves in various formats.
 * Returns a Chess instance with the moves applied, or null if nothing worked.
 * Tries: PGN/SAN, UCI, LAN, ICCF (in order).
 */
export function parseInput(text: string): Chess | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return tryPgn(trimmed) ?? tryUci(trimmed) ?? tryLan(trimmed) ?? tryIccf(trimmed);
}

function tryPgn(text: string): Chess | null {
  const game = new Chess();
  try {
    game.loadPgn(text);
    if (game.history().length > 0) return game;
  } catch {}
  return null;
}

function tryUci(text: string): Chess | null {
  // UCI moves: e2e4 e7e5 g1f3 e7e8q (4-5 chars each)
  const tokens = text.replace(/[,;\n]+/g, " ").split(/\s+/);
  if (!tokens.every((t) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(t))) return null;

  const game = new Chess();
  for (const token of tokens) {
    const from = token.slice(0, 2);
    const to = token.slice(2, 4);
    const promotion = token[4] as "q" | "r" | "b" | "n" | undefined;
    try {
      game.move({ from, to, promotion });
    } catch {
      return null;
    }
  }
  return game.history().length > 0 ? game : null;
}

function tryLan(text: string): Chess | null {
  // LAN moves: Ng1-f3, e4xd5, e2-e4, Qd1xd8+
  // Strip move numbers, result markers
  const cleaned = text.replace(/\d+\.\s*/g, "").replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, "");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  // Each token should have a recognizable from-to pattern with - or x separator
  const lanPattern = /^[KQRBN]?([a-h][1-8])[-x]([a-h][1-8])(?:=[QRBN])?[+#]?$/;
  if (!tokens.every((t) => lanPattern.test(t) || /^O-O(-O)?[+#]?$/.test(t))) return null;

  const game = new Chess();
  for (const token of tokens) {
    if (/^O-O(-O)?[+#]?$/.test(token)) {
      try {
        game.move(token.replace(/[+#]/, ""));
      } catch {
        return null;
      }
      continue;
    }
    const match = token.match(lanPattern);
    if (!match) return null;
    const from = match[1]!;
    const to = match[2]!;
    const promoMatch = token.match(/=([QRBN])/);
    const promotion = promoMatch ? (promoMatch[1]!.toLowerCase() as "q" | "r" | "b" | "n") : undefined;
    try {
      game.move({ from, to, promotion });
    } catch {
      return null;
    }
  }
  return game.history().length > 0 ? game : null;
}

function tryIccf(text: string): Chess | null {
  // ICCF numeric: 5254 5755 7163 (each digit pair = file+rank, 1-indexed)
  const tokens = text.replace(/[,;\n.]+/g, " ").split(/\s+/).filter(Boolean);
  // Each token is 4 or 5 digits
  if (!tokens.every((t) => /^\d{4,5}$/.test(t))) return null;

  const files = "abcdefgh";
  const game = new Chess();
  for (const token of tokens) {
    const fromFile = files[parseInt(token[0]!) - 1];
    const fromRank = token[1];
    const toFile = files[parseInt(token[2]!) - 1];
    const toRank = token[3];
    if (!fromFile || !toFile) return null;
    const from = `${fromFile}${fromRank}`;
    const to = `${toFile}${toRank}`;
    const promoDigit = token[4];
    const promoMap: Record<string, "q" | "r" | "b" | "n"> = { "1": "q", "2": "r", "3": "b", "4": "n" };
    const promotion = promoDigit ? promoMap[promoDigit] : undefined;
    try {
      game.move({ from, to, promotion });
    } catch {
      return null;
    }
  }
  return game.history().length > 0 ? game : null;
}
