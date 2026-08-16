"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { PlayerProvider } from "@/context/PlayerContext";
import Navbar from "./Navbar";
import MiniPlayer from "./MiniPlayer";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        <PlayerProvider>
          <Navbar />
          <main className="flex-1 pb-24">{children}</main>
          <MiniPlayer />
        </PlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
