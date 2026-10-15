import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fankari Maison — Handcrafted Tote Bags",
  description:
    "Small-batch tote bags handcrafted from natural canvas, jute and full-grain leather. Built for everyday adventures, designed to last a lifetime.",
  keywords: [
    "tote bags",
    "handcrafted",
    "artisan",
    "canvas tote",
    "leather tote",
    "Fankari Maison",
  ],
  authors: [{ name: "Fankari Maison" }],
  openGraph: {
    title: "Fankari Maison — Handcrafted Tote Bags",
    description:
      "Small-batch tote bags handcrafted from natural canvas, jute and full-grain leather.",
    siteName: "Fankari Maison",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ClerkProvider
          appearance={{
            theme: shadcn,
            variables: { colorPrimary: "var(--brand)" },
          }}
        >
          <Providers>{children}</Providers>
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}