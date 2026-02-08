import { ImageResponse } from "next/og";
import { Chess } from "chess.js";
import { fenToGrid, PIECE_UNICODE } from "@/lib/board-renderer";
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

  const fen = chess.fen();
  const grid = fenToGrid(fen);
  const turn = chess.turn() === "w" ? "White" : "Black";
  const moveCount = chess.history().length;

  const squareSize = 62;
  const boardSize = squareSize * 8;

  let statusText = `${turn} to move`;
  if (chess.isCheckmate()) {
    statusText = chess.turn() === "w" ? "Black wins!" : "White wins!";
  } else if (chess.isDraw()) {
    statusText = "Draw";
  } else if (chess.isCheck()) {
    statusText = `${turn} in check`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          backgroundColor: "#1a1a2e",
          padding: "24px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Board */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: `${boardSize}px`,
            height: `${boardSize}px`,
            borderRadius: "4px",
            overflow: "hidden",
            flexShrink: 0,
            marginTop: "19px",
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
                    fontSize: "42px",
                    lineHeight: 1,
                  }}
                >
                  {piece ? PIECE_UNICODE[piece] || "" : ""}
                </div>
              );
            })
          )}
        </div>

        {/* Info panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            marginLeft: "40px",
            flex: 1,
            color: "#e0e0e0",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: "16px",
            }}
          >
            OG Chess
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#a0a0c0",
              marginBottom: "24px",
            }}
          >
            {statusText}
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#808090",
              marginBottom: "12px",
            }}
          >
            {moveCount > 0 ? `${moveCount} move${moveCount !== 1 ? "s" : ""} played` : "New game"}
          </div>
          {pgn && (
            <div
              style={{
                fontSize: "16px",
                color: "#606070",
                maxWidth: "380px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {pgn.length > 80 ? pgn.slice(0, 80) + "..." : pgn}
            </div>
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
