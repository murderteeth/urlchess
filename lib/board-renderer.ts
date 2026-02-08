export type PieceCode = string | null;

export const PIECE_UNICODE: Record<string, string> = {
  K: "\u2654",
  Q: "\u2655",
  R: "\u2656",
  B: "\u2657",
  N: "\u2658",
  P: "\u2659",
  k: "\u265A",
  q: "\u265B",
  r: "\u265C",
  b: "\u265D",
  n: "\u265E",
  p: "\u265F",
};

export function fenToGrid(fen: string): PieceCode[][] {
  const placement = fen.split(" ")[0]!;
  const rows = placement.split("/");
  const grid: PieceCode[][] = [];

  for (const row of rows) {
    const rank: PieceCode[] = [];
    for (const ch of row) {
      if (ch >= "1" && ch <= "8") {
        for (let i = 0; i < parseInt(ch, 10); i++) {
          rank.push(null);
        }
      } else {
        rank.push(ch);
      }
    }
    grid.push(rank);
  }

  return grid;
}
