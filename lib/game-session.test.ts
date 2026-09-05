import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess, DEFAULT_POSITION } from "chess.js";
import { GameSession } from "./game-session";
import { decodeMoves, encodeMoves } from "./moves";
import { parseInput } from "./parse";

function assertMatches(session: GameSession, game: Chess) {
  const snapshot = session.snapshot();
  assert.equal(snapshot.fen, game.fen());
  assert.deepEqual(snapshot.history, game.history());
  assert.equal(snapshot.encoded, encodeMoves(game.pgn()));
  const restored = new Chess();
  restored.loadPgn(decodeMoves(snapshot.encoded!));
  assert.equal(restored.fen(), game.fen());
}

test("incremental URLs match existing links, including castling and en passant", () => {
  for (const pgn of [
    "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O Be7 5. d3 O-O",
    "1. e4 a6 2. e5 d5 3. exd6",
    "1. a4 h5 2. a5 h4 3. a6 h3 4. axb7 hxg2 5. bxa8=N",
  ]) {
    const source = new Chess();
    source.loadPgn(pgn);
    const game = new Chess();
    const session = new GameSession();
    for (const move of source.history({ verbose: true })) {
      assert.equal(session.move(move.from, move.to, move.promotion), true);
      game.move({ from: move.from, to: move.to, promotion: move.promotion });
      assertMatches(session, game);
    }
    const saved = session.snapshot();
    session.undoAll();
    assert.equal(session.snapshot().fen, DEFAULT_POSITION);
    session.redoAll();
    assert.deepEqual(session.snapshot(), saved);
  }
});

test("undo, redo, and branching preserve URL history and discard abandoned moves", () => {
  const session = new GameSession("1. e4 e5 2. Nf3 Nc6");
  const original = session.snapshot();
  session.undo();
  session.undoAll();
  assert.equal(session.snapshot().encoded, "");
  session.redoAll();
  assert.deepEqual(session.snapshot(), original);
  session.undo();
  assert.equal(session.move("d7", "d6"), true);
  assert.equal(session.redo(), false);
  const game = new Chess();
  game.loadPgn("1. e4 e5 2. Nf3 d6");
  assertMatches(session, game);
});

test("invalid moves leave both the position and redo history intact", () => {
  const session = new GameSession("1. e4 e5");
  session.undo();
  const before = session.snapshot();
  assert.equal(session.move("e7", "e4"), false);
  assert.deepEqual(session.snapshot(), before);
  assert.equal(session.redo(), true);
});

test("repetition detection survives undo and redo", () => {
  const session = new GameSession("1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8");
  assert.equal(session.snapshot().statusText, "Draw by repetition");
  session.undo();
  assert.equal(session.snapshot().statusText, "Black to move");
  session.redo();
  assert.equal(session.snapshot().statusText, "Draw by repetition");
});

test("imports in every supported notation can be continued and shared", () => {
  for (const input of ["1. e4 e5", "e2e4 e7e5", "e2-e4 e7-e5", "5254 5755"]) {
    const parsed = parseInput(input);
    assert.ok(parsed);
    const session = new GameSession();
    session.load(parsed);
    session.move("g1", "f3");
    const expected = new Chess();
    expected.loadPgn("1. e4 e5 2. Nf3");
    assertMatches(session, expected);
    session.reset();
    assert.equal(session.snapshot().fen, DEFAULT_POSITION);
    assert.equal(session.snapshot().canRedo, false);
  }
});

test("published snapshots remain unchanged after subsequent engine mutations", () => {
  const session = new GameSession();
  const before = session.snapshot();
  session.move("e2", "e4");
  assert.equal(before.fen, DEFAULT_POSITION);
  assert.deepEqual(before.history, []);
  assert.equal(before.encoded, "");
  assert.equal(before.canUndo, false);
});

test("ordinary moves and navigation never reload PGN or reconstruct move history", () => {
  const session = new GameSession("1. e4 e5 2. Nf3 Nc6");
  const loadPgn = Chess.prototype.loadPgn;
  const history = Chess.prototype.history;
  try {
    Chess.prototype.loadPgn = () => { throw new Error("PGN reparsed during interaction"); };
    Chess.prototype.history = () => { throw new Error("Entire history reconstructed during interaction"); };
    assert.equal(session.move("f1", "c4"), true);
    assert.equal(session.snapshot().history.at(-1), "Bc4");
    assert.equal(session.undo(), true);
    assert.equal(session.redo(), true);
    assert.equal(session.snapshot().history.at(-1), "Bc4");
  } finally {
    Chess.prototype.loadPgn = loadPgn;
    Chess.prototype.history = history;
  }
});

test("custom starting positions retain their start when navigating history", () => {
  const game = new Chess("8/P6k/8/8/8/8/8/7K w - - 0 1");
  const start = game.fen();
  const session = new GameSession();
  session.load(game);
  assert.equal(session.move("a7", "a8", "n"), true);
  assert.equal(session.snapshot().encoded, null);
  session.undoAll();
  assert.equal(session.snapshot().fen, start);
  session.redoAll();
  assert.equal(session.snapshot().history[0], "a8=N");
});
