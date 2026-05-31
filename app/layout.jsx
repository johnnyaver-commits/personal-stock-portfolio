import "./globals.css";

export const metadata = {
  title: "個人股票庫存即時網站",
  description: "管理持股、交易紀錄與即時估值的投資組合儀表板"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
