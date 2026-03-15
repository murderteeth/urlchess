# URL Chess

Make your move, share the link.

URL Chess is correspondence chess in a URL. The entire game state lives in the link — no accounts, no servers, no databases. Open a link, make a move, send the new link back. That's it.

## How it works

Every move is encoded as an index into the sorted list of legal moves at that position, packed into bytes and base64url-encoded. A 20-move game fits in ~27 characters instead of ~200 with raw PGN.

When a link is shared, the OG image shows the current board position so your opponent sees the game state right in the chat preview.

## Features

- Board preview images in shared links
- Paste moves in PGN, UCI, LAN, or ICCF format
- Copyable FEN for position sharing
- Move table and editable PGN textarea
- Undo/redo with full history
- Mobile

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [react-chessboard](https://github.com/Clariity/react-chessboard) v5
- [chess.js](https://github.com/jhlywa/chess.js) v1
- [Bun](https://bun.sh/)

## Development

```sh
bun install
bun run dev
```
