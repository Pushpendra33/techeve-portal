import type { Metadata } from "next";
import "./globals.css";
import "react-loading-skeleton/dist/skeleton.css";
import { Toaster } from "sonner";
import { HashTokenBridge } from "@/components/auth/HashTokenBridge";

export const metadata: Metadata = {
  title: "TechEve Portal",
  description: "TechEve Academy student and staff portal.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HashTokenBridge />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
