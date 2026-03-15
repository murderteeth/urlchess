"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square, type Move } from "chess.js";
import { encodeMoves } from "@/lib/moves";
import { parseInput } from "@/lib/parse";

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

  const redoStack = useRef<Move[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [boardWidth, setBoardWidth] = useState(480);
  const [showFenCopied, setShowFenCopied] = useState(false);
  const [showPgnCopied, setShowPgnCopied] = useState(false);
  const [pgnText, setPgnText] = useState("");

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
    const url = pgn ? `?m=${encodeMoves(pgn)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, []);

  const canUndo = game.history().length > 0;
  const canRedo = redoStack.current.length > 0;

  // Legal moves
  const legalMoves = useMemo(() => {
    return game.moves({ verbose: true });
  }, [game]);

  const movesForSquare = useCallback(
    (square: Square): Move[] => {
      return legalMoves.filter((m) => m.from === square);
    },
    [legalMoves]
  );

  // Make a move (clears redo stack)
  const makeMove = useCallback(
    (from: Square, to: Square): boolean => {
      const newGame = new Chess();
      newGame.loadPgn(game.pgn());
      try {
        newGame.move({ from, to, promotion: "q" });
      } catch {
        return false;
      }
      redoStack.current = [];
      setGame(newGame);
      setSelectedSquare(null);
      syncUrl(newGame);
      return true;
    },
    [game, syncUrl]
  );

  // Click-to-move handler
  const onSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      const sq = square as Square;

      if (selectedSquare) {
        if (makeMove(selectedSquare, sq)) return;
        if (selectedSquare === sq) {
          setSelectedSquare(null);
          return;
        }
      }

      const moves = movesForSquare(sq);
      if (moves.length > 0) {
        setSelectedSquare(sq);
      } else {
        setSelectedSquare(null);
      }
    },
    [selectedSquare, makeMove, movesForSquare]
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

  // Undo: pop last move, push to redo stack
  const undo = useCallback(() => {
    const newGame = new Chess();
    newGame.loadPgn(game.pgn());
    const undone = newGame.undo();
    if (!undone) return;
    redoStack.current = [...redoStack.current, undone];
    setGame(newGame);
    setSelectedSquare(null);
    syncUrl(newGame);
  }, [game, syncUrl]);

  // Redo: pop from redo stack, apply to game
  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const newGame = new Chess();
    newGame.loadPgn(game.pgn());
    const move = redoStack.current[redoStack.current.length - 1]!;
    try {
      newGame.move({ from: move.from, to: move.to, promotion: move.promotion });
    } catch {
      redoStack.current = [];
      return;
    }
    redoStack.current = redoStack.current.slice(0, -1);
    setGame(newGame);
    setSelectedSquare(null);
    syncUrl(newGame);
  }, [game, syncUrl]);

  // Undo all: reset to starting position, push all moves to redo
  const undoAll = useCallback(() => {
    const moves = game.history({ verbose: true });
    if (moves.length === 0) return;
    redoStack.current = [...redoStack.current, ...moves.reverse()];
    const newGame = new Chess();
    setGame(newGame);
    setSelectedSquare(null);
    syncUrl(newGame);
  }, [game, syncUrl]);

  // Redo all: replay all redo moves
  const redoAll = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const newGame = new Chess();
    newGame.loadPgn(game.pgn());
    const stack = [...redoStack.current].reverse();
    for (const move of stack) {
      try {
        newGame.move({ from: move.from, to: move.to, promotion: move.promotion });
      } catch {
        break;
      }
    }
    redoStack.current = [];
    setGame(newGame);
    setSelectedSquare(null);
    syncUrl(newGame);
  }, [game, syncUrl]);

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
    redoStack.current = [];
    setGame(g);
    setSelectedSquare(null);
    syncUrl(g);
  }, [syncUrl]);

  // Move history — also sync textarea
  const history = useMemo(() => {
    const h = game.history();
    const stripped = game.pgn().replace(/\[.*?\]\s*/g, "").trim();
    setPgnText(h.length > 0 ? stripped : "");
    return h;
  }, [game]);

  const moveRows = useMemo(() => {
    const rows: [number, string, string | undefined][] = [];
    for (let i = 0; i < history.length; i += 2) {
      rows.push([Math.floor(i / 2) + 1, history[i]!, history[i + 1]]);
    }
    return rows;
  }, [history]);

  // Handle paste/edit in any supported format
  const handlePgnChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setPgnText(value);
      const parsed = parseInput(value);
      if (!parsed) return;
      redoStack.current = [];
      setGame(parsed);
      setSelectedSquare(null);
      syncUrl(parsed);
    },
    [syncUrl]
  );

  // Copy FEN to clipboard
  const copyFen = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(game.fen());
      setShowFenCopied(true);
      setTimeout(() => setShowFenCopied(false), 2000);
    } catch {}
  }, [game]);

  // Status text
  const statusText = useMemo(() => {
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
  }, [game]);

  return (
    <div className="game-container">
      <header className="header">
        <div className="header-left">
          <h1 className="title">OG Chess</h1>
          <p className="subtitle">Make your move, share the link</p>
        </div>
        <div className="header-right">
          <span className="status">{statusText}</span>
        </div>
      </header>

      <div className="board-wrapper" style={{ width: boardWidth, height: boardWidth }}>
        <Chessboard
          options={{
            position: game.fen(),
            onSquareClick,
            onPieceDrop,
            boardOrientation,
            squareStyles,
            darkSquareStyle: { backgroundColor: "#779952" },
            lightSquareStyle: { backgroundColor: "#edeed1" },
          }}
        />
      </div>

      <div className="controls">
        <div className="controls-row">
          <button onClick={newGame} title="New game">
            New
          </button>
          <button onClick={undoAll} disabled={!canUndo} title="Undo all">
            &#x23EE;
          </button>
          <button onClick={undo} disabled={!canUndo} title="Undo">
            &#x23F4;
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo">
            &#x23F5;
          </button>
          <button onClick={redoAll} disabled={!canRedo} title="Redo all">
            &#x23ED;
          </button>
          <button onClick={() => setBoardOrientation((o) => (o === "white" ? "black" : "white"))} title="Flip board">
            &#x21C5;
          </button>
          <button className="btn-share" onClick={copyUrl} title="Copy URL">
            {showCopied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>

      <div className="move-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>White</th>
                <th>Black</th>
              </tr>
            </thead>
            <tbody>
              {moveRows.map(([num, white, black]) => (
                <tr key={num}>
                  <td className="move-num">{num}.</td>
                  <td>{white}</td>
                  <td>{black || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      <div className="pgn-wrapper">
        <textarea
          className="pgn-input"
          value={pgnText}
          onChange={handlePgnChange}
          placeholder="Paste moves here (PGN, UCI, LAN, ICCF)..."
          rows={10}
          spellCheck={false}
        />
        <button
          className="pgn-copy"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(pgnText);
              setShowPgnCopied(true);
              setTimeout(() => setShowPgnCopied(false), 2000);
            } catch {}
          }}
          title="Copy PGN"
        >
          {showPgnCopied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="fen-row">
        <div className="fen-label">
          <span className="fen-prefix">FEN</span> {game.fen()}
        </div>
        <button
          className="fen-copy"
          onClick={copyFen}
          title="Copy FEN"
        >
          {showFenCopied ? "Copied!" : "Copy"}
        </button>
      </div>

      {showCopied && <div className="toast">URL copied to clipboard!</div>}
    </div>
  );
}
