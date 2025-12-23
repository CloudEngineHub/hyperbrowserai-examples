import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Deep Gift Research - AI-Powered Gift Recommendations",
  description: "Find the perfect gift backed by deep web research. AI analyzes Reddit discussions, reviews, and expert guides to recommend personalized gifts.",
  keywords: ["gift ideas", "gift recommendations", "AI gift finder", "personalized gifts"],
  authors: [{ name: "Hyperbrowser" }],
  openGraph: {
    title: "Deep Gift Research",
    description: "AI-powered gift recommendations backed by real discussions and expert reviews",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="font-sans antialiased tracking-[-0.02em]">
        {children}
      </body>
    </html>
  );
}
