import type { Metadata } from "next";
import "./globals.css";
import "./interactions.css";

export const metadata: Metadata = { title: "Ditus", description: "Ditus" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
