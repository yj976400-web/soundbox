import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    default: "SoundBox — 효과음 공유 플랫폼",
    template: "%s | SoundBox",
  },
  description:
    "누구나 효과음을 업로드하고 검색, 재생, 다운로드, 찜할 수 있는 효과음 공유 플랫폼",
  openGraph: {
    title: "SoundBox — 효과음 공유 플랫폼",
    description: "필요한 효과음을 찾고, 직접 공유하세요.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
      <head>
        <meta
          name="google-adsense-account"
          content="ca-pub-5964924015385880"
        />

        <meta
          name="google-site-verification"
          content="tTRb1Vn7YtMdU-tqcHWHNn4SODv5nLqGIm6VinxxyRQ"
        />

        <meta
          name="google-site-verification"
          content="WANct72CmlInjFMgVDDLdrnvvOQ5sIWk1hl1dHA6KcA"
        />
      </head>

      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
