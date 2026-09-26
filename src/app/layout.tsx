import type { Metadata } from "next";
import { Onest } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { AppProvider } from "@/components/app-provider";
import { AuthModal } from "@/components/auth-modal";
import { LocaleProvider } from "@/components/locale-provider";
import { PageRule } from "@/components/page-rule";
import { SiteFooter } from "@/components/site-footer";
import { getLocale, getT } from "@/lib/i18n/server";
import "./globals.css";

// One family for everything. Variable weight, and native Cyrillic for the Russian locale.
const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: "Darkroom", template: "%s – Darkroom" },
    description: t("meta.description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    // data-scroll-behavior: the document scrolls smoothly for in-page anchors; without this flag Next 16 would
    // animate its own scroll-to-top on navigation and then land under the sticky header.
    <html lang={locale} data-scroll-behavior="smooth" className={`${onest.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LocaleProvider locale={locale}>
          <AppProvider>
            <AppHeader />
            <PageRule />
            {children}
            <SiteFooter />
            <AuthModal />
          </AppProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
