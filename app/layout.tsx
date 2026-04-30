import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "InstaReply — Instagram Comment to DM Automation",
  description:
    "Automatically send DMs to users who comment specific keywords on your Instagram posts. Open-source, self-hostable, powered by the official Meta Graph API.",
  keywords: ["instagram", "automation", "DM", "comments", "manychat alternative"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`}>
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
