"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square, type Move } from "chess.js";
import { encodePgn } from "@/lib/pgn";

interface Props {
  initialPgn?: string;
}

export default function ChessGame({ initialPgn }: Props) {
  const [game, setGame] = useState<Chess>(() => {
    const g = new Chess();
    if (initialPgn) {
      try {
        g.loadPgn(initialPgn);
      } catch {
        // invalid PGN, start fresh
      }
    }
    return g;
  });

  const history = useMemo(
    () => game.history({ verbose: true }),
    [game]
  );
  const [viewIndex, setViewIndex] = useState<number>(history.length - 1);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [boardWidth, setBoardWidth] = useState(480);

  // Keep viewIndex in sync when history length changes (new move made)
  useEffect(() => {
    setViewIndex(history.length - 1);
  }, [history.length]);

  // Responsive board sizing
  useEffect(() => {
    function updateWidth() {
      const w = Math.min(window.innerWidth - 32, 560);
      setBoardWidth(Math.max(280, w));
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Sync URL with current game PGN
  const syncUrl = useCallback((g: Chess) => {
    const pgn = g.pgn();
    const url = pgn ? `?pgn=${encodePgn(pgn)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, []);

  const isAtLatest = viewIndex === history.length - 1;

  // The FEN to display: either the position after the viewed move, or the starting position
  const displayFen = useMemo(() => {
    if (viewIndex < 0) {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
    return history[viewIndex]!.after;
  }, [history, viewIndex]);

  // Legal moves from the current position (only if viewing latest)
  const legalMoves = useMemo(() => {
    if (!isAtLatest) return [];
    return game.moves({ verbose: true });
  }, [game, isAtLatest]);

  // Get legal moves for a specific square
  const movesForSquare = useCallback(
    (square: Square): Move[] => {
      return legalMoves.filter((m) => m.from === square);
    },
    [legalMoves]
  );

  // Make a move
  const makeMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (!isAtLatest) return false;
      const newGame = new Chess();
      newGame.loadPgn(game.pgn());
      try {
        newGame.move({ from, to, promotion: "q" });
      } catch {
        return false;
      }
      setGame(newGame);
      setSelectedSquare(null);
      syncUrl(newGame);
      return true;
    },
    [game, isAtLatest, syncUrl]
  );

  // Click-to-move handler
  const onSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      if (!isAtLatest) return;
      const sq = square as Square;

      if (selectedSquare) {
        // Try to move from selected to clicked square
        if (makeMove(selectedSquare, sq)) return;
        // If clicking the same square, deselect
        if (selectedSquare === sq) {
          setSelectedSquare(null);
          return;
        }
      }

      // Select this square if it has legal moves
      const moves = movesForSquare(sq);
      if (moves.length > 0) {
        setSelectedSquare(sq);
      } else {
        setSelectedSquare(null);
      }
    },
    [selectedSquare, isAtLatest, makeMove, movesForSquare]
  );

  // Drag-and-drop handler
  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }): boolean => {
      if (!targetSquare) return false;
      return makeMove(sourceSquare as Square, targetSquare as Square);
    },
    [makeMove]
  );

  // Highlight squares
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      for (const move of movesForSquare(selectedSquare)) {
        styles[move.to] = {
          background: "radial-gradient(circle, rgba(0,0,0,0.25) 25%, transparent 25%)",
        };
      }
    }
    return styles;
  }, [selectedSquare, movesForSquare]);

  // Navigation
  const goToStart = () => { setViewIndex(-1); setSelectedSquare(null); };
  const goBack = () => { setViewIndex((i) => Math.max(-1, i - 1)); setSelectedSquare(null); };
  const goForward = () => { setViewIndex((i) => Math.min(history.length - 1, i + 1)); setSelectedSquare(null); };
  const goToEnd = () => { setViewIndex(history.length - 1); setSelectedSquare(null); };

  // Copy URL
  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }, []);

  // New game
  const newGame = useCallback(() => {
    const g = new Chess();
    setGame(g);
    setSelectedSquare(null);
    syncUrl(g);
  }, [syncUrl]);

  // Status text
  const statusText = useMemo(() => {
    if (!isAtLatest) {
      const moveNum = viewIndex + 1;
      return `Viewing move ${moveNum} of ${history.length}`;
    }
    if (game.isCheckmate()) {
      return game.turn() === "w" ? "Black wins by checkmate!" : "White wins by checkmate!";
    }
    if (game.isDraw()) {
      if (game.isStalemate()) return "Draw by stalemate";
      if (game.isThreefoldRepetition()) return "Draw by repetition";
      if (game.isInsufficientMaterial()) return "Draw by insufficient material";
      return "Draw by fifty-move rule";
    }
    if (game.isCheck()) {
      return `${game.turn() === "w" ? "White" : "Black"} is in check`;
    }
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  }, [game, isAtLatest, viewIndex, history.length]);

  return (
    <div className="game-container">
      <div className="status">{statusText}</div>

      <div className="board-wrapper" style={{ width: boardWidth, height: boardWidth }}>
        <Chessboard
          options={{
            position: displayFen,
            onSquareClick,
            onPieceDrop,
            boardOrientation,
            allowDragging: isAtLatest,
            squareStyles,
            darkSquareStyle: { backgroundColor: "#779952" },
            lightSquareStyle: { backgroundColor: "#edeed1" },
          }}
        />
      </div>

      <div className="controls">
        <button onClick={goToStart} disabled={viewIndex < 0} title="Go to start">
          &#x23EE;
        </button>
        <button onClick={goBack} disabled={viewIndex < 0} title="Previous move">
          &#x23F4;
        </button>
        <button onClick={goForward} disabled={isAtLatest} title="Next move">
          &#x23F5;
        </button>
        <button onClick={goToEnd} disabled={isAtLatest} title="Go to end">
          &#x23ED;
        </button>
        <button onClick={() => setBoardOrientation((o) => (o === "white" ? "black" : "white"))} title="Flip board">
          &#x21C5;
        </button>
        <button onClick={copyUrl} title="Copy URL">
          {showCopied ? "Copied!" : "Share"}
        </button>
        <button onClick={newGame} title="New game">
          New
        </button>
      </div>

      {showCopied && <div className="toast">URL copied to clipboard!</div>}
    </div>
  );
}
