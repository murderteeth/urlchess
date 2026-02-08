export type PieceCode = string | null;

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
