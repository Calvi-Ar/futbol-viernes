import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "./ThemeRegistry";
import Sidebar from "./Sidebar";
import SessionProvider from "./SessionProvider";
import GroupProvider from "./GroupContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Armador de equipos del viernes",
  description: "Arma equipos balanceados para tu partido de fútbol del viernes.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <GroupProvider>
            <ThemeRegistry>
              <Sidebar>{children}</Sidebar>
            </ThemeRegistry>
          </GroupProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
