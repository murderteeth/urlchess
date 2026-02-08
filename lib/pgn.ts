export function encodePgn(pgn: string): string {
  const collapsed = pgn.replace(/\s+/g, " ").trim();
  return encodeURIComponent(collapsed);
}

export function decodePgn(encoded: string): string {
  // URLSearchParams decodes %XX sequences but also treats + as space.
  // chess.js PGN uses + for check notation, so we preserve literal + by
  // pre-encoding them before letting decodeURIComponent handle the rest.
  const preserved = encoded.replace(/\+/g, " ");
  try {
    return decodeURIComponent(preserved);
  } catch {
    return preserved;
  }
}
