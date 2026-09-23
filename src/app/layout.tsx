import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { AppProvider } from "@/components/app-provider";
import { AuthModal } from "@/components/auth-modal";
import { LocaleProvider } from "@/components/locale-provider";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { BANNER_STORAGE_KEY } from "@/components/promo-banner-key";
import { getLocale } from "@/lib/i18n/server";
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
  title: "Higgsfield AI Clone - Mert Eldemir",
  description: "Type a prompt, get a real AI image. No signup.",
};

// cover: lets env(safe-area-inset-bottom) report the iPhone home indicator, so the tab bar can clear it.
export const viewport: Viewport = { viewportFit: "cover" };

// Runs before paint so a dismissed promo banner doesn't flash in and then collapse.
const bannerScript = `try{if(localStorage.getItem(${JSON.stringify(BANNER_STORAGE_KEY)})==="1")document.documentElement.dataset.banner="dismissed"}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${barlowCondensed.variable} ${inter.variable} h-full antialiased`}
      // The banner script sets data-banner before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bannerScript }} />
      </head>
      <body className="flex min-h-full flex-col pb-(--tabbar-h) font-sans">
        <LocaleProvider locale={locale}>
          <AppProvider>
            <AppHeader />
            {children}
            <MobileTabBar />
            <AuthModal />
          </AppProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
