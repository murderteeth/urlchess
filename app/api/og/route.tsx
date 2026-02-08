import { ImageResponse } from "next/og";
import { Chess } from "chess.js";
import { fenToGrid } from "@/lib/board-renderer";
import { renderPiece } from "@/lib/piece-svgs";
import { decodePgn } from "@/lib/pgn";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPgn = searchParams.get("pgn") || "";
  const pgn = rawPgn ? decodePgn(rawPgn) : "";

  const chess = new Chess();
  if (pgn) {
    try {
      chess.loadPgn(pgn);
    } catch {
      // invalid PGN, use starting position
    }
  }

  const grid = fenToGrid(chess.fen());
  const squareSize = 74;
  const boardSize = squareSize * 8;
  const pieceSize = squareSize - 8;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          backgroundColor: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: `${boardSize}px`,
            height: `${boardSize}px`,
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          {grid.map((row, r) =>
            row.map((piece, c) => {
              const isLight = (r + c) % 2 === 0;
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: `${squareSize}px`,
                    height: `${squareSize}px`,
                    backgroundColor: isLight ? "#edeed1" : "#779952",
                  }}
                >
                  {piece ? renderPiece(piece, pieceSize) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
