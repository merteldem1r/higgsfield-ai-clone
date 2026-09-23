import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { AppProvider } from "@/components/app-provider";
import { AuthModal } from "@/components/auth-modal";
import { BANNER_STORAGE_KEY } from "@/components/promo-banner-key";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: "800",
  subsets: ["latin"],
});

// Variable font, so 400/500/600 all come from one file.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Higgsfield clone",
  description: "Type a prompt, get a real AI image. No signup.",
};

// Runs before paint so a dismissed promo banner doesn't flash in and then collapse.
const bannerScript = `try{if(localStorage.getItem(${JSON.stringify(BANNER_STORAGE_KEY)})==="1")document.documentElement.dataset.banner="dismissed"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${inter.variable} h-full antialiased`}
      // The banner script sets data-banner before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bannerScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AppProvider>
          <AppHeader />
          {children}
          <AuthModal />
        </AppProvider>
      </body>
    </html>
  );
}
