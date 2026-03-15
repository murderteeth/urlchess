import type { Metadata } from "next";
import { Chess } from "chess.js";
import { encodeMoves, decodeMoves } from "@/lib/moves";
import ChessGame from "@/components/ChessGame";

type Props = {
  searchParams: Promise<{ m?: string }>;
};

function buildTitle(pgn: string): string {
  if (!pgn) return "White to move";
  const game = new Chess();
  try { game.loadPgn(pgn); } catch { return "White to move"; }
  const history = game.history();
  const turn = game.turn() === "w" ? "White" : "Black";
  if (history.length === 0) return "White to move";
  const lastMove = history[history.length - 1];
  const moveNum = Math.ceil(history.length / 2);
  const dot = history.length % 2 === 1 ? `${moveNum}.` : `${moveNum}...`;
  return `${dot} ${lastMove} - ${turn} to move`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const pgn = params.m ? decodeMoves(params.m) : "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const ogParam = pgn ? `?m=${encodeMoves(pgn)}` : "";

  return {
    title: buildTitle(pgn),
    description: "Correspondence chess in a URL. Make your move, share the link.",
    openGraph: {
      title: "OG Chess",
      description: pgn || "A new game of chess",
      images: [
        {
          url: `${baseUrl}/api/og${ogParam}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const pgn = params.m ? decodeMoves(params.m) : "";

  return (
    <main className="main">
      <ChessGame initialPgn={pgn} />
    </main>
  );
}
