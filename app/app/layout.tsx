/**
 * Next.js App Router root layout: wraps every page. Server component.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnnotationRoot } from "@/components/annotations";

// Next self-hosts Inter; the browser needs no Google font request.
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Nordic Home - support agent demo",
  description: "Multi-agent customer support built with the OpenAI Agents SDK and the Vercel AI SDK",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}<AnnotationRoot /></body>
    </html>
  );
}
