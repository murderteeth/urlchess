import type { Metadata } from "next";
import { decodePgn, encodePgn } from "@/lib/pgn";
import ChessGame from "@/components/ChessGame";

type Props = {
  searchParams: Promise<{ pgn?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const pgn = params.pgn ? decodePgn(params.pgn) : "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const ogPgn = pgn ? `?pgn=${encodePgn(pgn)}` : "";

  return {
    title: pgn ? `OG Chess - ${pgn.slice(0, 60)}` : "OG Chess",
    description: "Correspondence chess in a URL. Make a move, share the link.",
    openGraph: {
      title: "OG Chess",
      description: pgn || "A new game of chess",
      images: [
        {
          url: `${baseUrl}/api/og${ogPgn}`,
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
  const pgn = params.pgn ? decodePgn(params.pgn) : "";

  return (
    <main className="main">
      <h1 className="title">OG Chess</h1>
      <p className="subtitle">Make a move, share the link</p>
      <ChessGame initialPgn={pgn} />
    </main>
  );
}
