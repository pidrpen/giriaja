import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ГОСТ → ISO / DIN: подбор гаек",
  description: "Инженерный справочник и автоподбор конкретных обозначений гаек с ГОСТ на ISO и DIN.",
  other: {
    "codex-preview": "development",
  },
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
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
