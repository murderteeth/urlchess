"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Chessboard, defaultPieces } from "react-chessboard";
import { type Square, type Move } from "chess.js";
import { GameSession } from "@/lib/game-session";
import { parseInput } from "@/lib/parse";
import {
  PiArrowCounterClockwiseFill,
  PiSkipBackFill,
  PiCaretLeftFill,
  PiCaretRightFill,
  PiSkipForwardFill,
  PiArrowsDownUpFill,
  PiLinkBold,
  PiCopyFill,
  PiCheckBold,
  PiGithubLogoFill,
} from "react-icons/pi";

interface Props {
  initialPgn?: string;
}

export default function ChessGame({ initialPgn }: Props) {
  const [session] = useState(() => new GameSession(initialPgn));
  const [position, setPosition] = useState(() => session.snapshot());
  const { fen, history, legalMoves, statusText, canUndo, canRedo } = position;
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [showFenCopied, setShowFenCopied] = useState(false);
  const [showPgnCopied, setShowPgnCopied] = useState(false);
  const [pgnText, setPgnText] = useState(position.pgn);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Publish an immutable snapshot only after the engine changes. Selection,
  // copying, and board flips never replay the game or regenerate legal moves.
  const refresh = useCallback(() => {
    const next = session.snapshot();
    setPosition(next);
    setPgnText(next.pgn);
    setSelectedSquare(null);
    setPendingPromotion(null);
    try {
      if (next.encoded === null) return;
      const url = next.encoded ? `?m=${next.encoded}` : window.location.pathname;
      window.history.replaceState(null, "", url);
    } catch (e) {
      console.error("Failed to sync URL:", e);
    }
  }, [session]);

  const movesForSquare = useCallback(
    (square: Square): Move[] => {
      return legalMoves.filter((m) => m.from === square);
    },
    [legalMoves]
  );

  // Check if a move is a promotion
  const isPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      return legalMoves.some((m) => m.from === from && m.to === to && m.promotion);
    },
    [legalMoves]
  );

  // Execute a move with a specific promotion piece (or undefined)
  const executeMove = useCallback(
    (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n"): boolean => {
      if (!session.move(from, to, promotion)) return false;
      refresh();
      return true;
    },
    [session, refresh]
  );

  // Make a move — if promotion, show picker instead
  const makeMove = useCallback(
    (from: Square, to: Square): boolean => {
      // Verify it's a legal move at all
      if (!legalMoves.some((m) => m.from === from && m.to === to)) return false;
      if (isPromotion(from, to)) {
        setPendingPromotion({ from, to });
        setSelectedSquare(null);
        return true;
      }
      return executeMove(from, to);
    },
    [legalMoves, isPromotion, executeMove]
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

  const undo = useCallback(() => {
    if (session.undo()) refresh();
  }, [session, refresh]);

  const redo = useCallback(() => {
    if (session.redo()) refresh();
  }, [session, refresh]);

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); undo(); }
      if (e.key === "ArrowRight") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const undoAll = useCallback(() => {
    session.undoAll();
    refresh();
  }, [session, refresh]);

  const redoAll = useCallback(() => {
    session.redoAll();
    refresh();
  }, [session, refresh]);

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

  const newGame = useCallback(() => {
    session.reset();
    refresh();
  }, [session, refresh]);

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
      session.load(parsed);
      refresh();
    },
    [session, refresh]
  );

  // Copy FEN to clipboard
  const copyFen = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fen);
      setShowFenCopied(true);
      setTimeout(() => setShowFenCopied(false), 2000);
    } catch {}
  }, [fen]);

  return (
    <div className="game-container">
      <header className="header">
        <div className="header-left">
          <h1 className="title">URL Chess</h1>
          <p className="subtitle">Make your move, share the link</p>
        </div>
        <div className="header-right">
          <span className="status">{statusText}</span>
        </div>
      </header>

      <div className="board-wrapper">
        <Chessboard
          options={{
            position: fen,
            onSquareClick,
            onPieceDrop,
            boardOrientation,
            squareStyles,
            darkSquareStyle: { backgroundColor: "#779952" },
            lightSquareStyle: { backgroundColor: "#edeed1" },
          }}
        />
        {pendingPromotion && (
          <div className="promo-overlay" onClick={() => setPendingPromotion(null)}>
            <div className="promo-picker" onClick={(e) => e.stopPropagation()}>
              {(["q", "r", "b", "n"] as const).map((p) => {
                const key = `${position.turn === "w" ? "w" : "b"}${p.toUpperCase()}`;
                const PieceSvg = defaultPieces[key];
                return (
                  <button
                    key={p}
                    className="promo-piece"
                    onClick={() => executeMove(pendingPromotion.from, pendingPromotion.to, p)}
                  >
                    {PieceSvg && <PieceSvg />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="controls">
        <div className="controls-row">
          <button onClick={newGame} title="New game">
            <PiArrowCounterClockwiseFill />
          </button>
          <button onClick={undoAll} disabled={!canUndo} title="Undo all">
            <PiSkipBackFill />
          </button>
          <button onClick={undo} disabled={!canUndo} title="Undo">
            <PiCaretLeftFill />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo">
            <PiCaretRightFill />
          </button>
          <button onClick={redoAll} disabled={!canRedo} title="Redo all">
            <PiSkipForwardFill />
          </button>
          <button onClick={() => setBoardOrientation((o) => (o === "white" ? "black" : "white"))} title="Flip board">
            <PiArrowsDownUpFill />
          </button>
          <button className="btn-share" onClick={copyUrl} title="Copy URL">
            {showCopied ? <PiCheckBold /> : <PiLinkBold />}
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
          {showPgnCopied ? <PiCheckBold /> : <PiCopyFill />}
        </button>
      </div>

      <div className="fen-row">
        <div className="fen-label">
          <span className="fen-prefix">FEN</span> {fen}
        </div>
        <button
          className="fen-copy"
          onClick={copyFen}
          title="Copy FEN"
        >
          {showFenCopied ? <PiCheckBold /> : <PiCopyFill />}
        </button>
      </div>

      {showCopied && <div className="toast">URL copied to clipboard!</div>}

      <footer className="footer">
        <a href="https://github.com/murderteeth/urlchess" target="_blank" rel="noopener noreferrer">
          <PiGithubLogoFill /> GitHub
        </a>
      </footer>
    </div>
  );
}
