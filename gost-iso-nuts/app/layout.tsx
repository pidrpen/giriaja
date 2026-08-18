import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ГОСТ → ISO / DIN: гайки, шайбы и винты",
  description: "Инженерный справочник и автоподбор обозначений гаек, шайб и винтов с ГОСТ на ISO и DIN.",
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
