import type { Metadata } from "next";
import "./globals.css";
export const viewport={themeColor:"#132441"};

export const metadata: Metadata = {
  title: "School Ledger | School Accounts",
  description: "Manage school fees, student accounts, receipts and reports.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
