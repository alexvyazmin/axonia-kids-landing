import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Нейробук Axonia Kids — 15 минут в день без лишних решений",
  description:
    "24 готовых занятия для детей 3–6 лет. Откройте страницу — и не нужно придумывать, во что играть сегодня. Ранняя цена для первых 100 покупателей — 490 ₽.",
  openGraph: {
    title: "Нейробук Axonia Kids",
    description:
      "Готовые занятия на 15 минут. Без подготовки и бесконечного поиска идей.",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-milky text-slate-dark antialiased">{children}</body>
    </html>
  );
}
