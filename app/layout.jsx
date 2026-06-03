import "./globals.css";

export const metadata = {
  title: "家庭股票庫存",
  description: "整合多人持股、即時報價、資產趨勢與損益追蹤的家庭股票庫存網站",
  appleWebApp: {
    capable: true,
    title: "家庭股票庫存",
    statusBarStyle: "default"
  }
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
