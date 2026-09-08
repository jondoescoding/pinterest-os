import type { Metadata } from "next";
import { Montserrat, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import AgentationTool from "./components/AgentationTool";
import ScrollArea from "./components/ScrollArea";
import Sidebar from "./components/Sidebar";

// Database-backed pages must resolve at request time, not during a clean build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pinterest OS",
  description: "Self-hosted Pinterest content operations and publishing",
};

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${sourceSans.variable}`}>
      <body>
        <div className="app">
          <Sidebar />
          <ScrollArea className="main">
            <main className="main-inner">{children}</main>
          </ScrollArea>
        </div>
        <AgentationTool />
      </body>
    </html>
  );
}
