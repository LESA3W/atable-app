import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import { AppChrome } from "@/components/AppChrome";
import { LaunchRedirect } from "@/components/LaunchRedirect";
import { PageTransition } from "@/components/PageTransition";
import { ProfileProvider } from "@/components/ProfileProvider";
import { RegisterSW } from "@/components/RegisterSW";
import { SplashScreen } from "@/components/SplashScreen";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://a-taaaable.vercel.app"),
  applicationName: "À table !",
  title: "À table !",
  description: "Les goûts de la famille, et des idées de repas qui plaisent à tout le monde.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "À table",
    // Transparent status bar so each screen's own top shows through it: the dark modal
    // backdrop darkens the top too, the cream taste-swipe stays cream (no orange strip).
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#F26F1C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // no pinch-zoom
  userScalable: false, // no zoom at all (native-app feel)
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${baloo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <RegisterSW />
        <SplashScreen />
        <LaunchRedirect />
        <ProfileProvider>
          <AppChrome />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-[var(--bottomnav-space)] pt-5 md:pb-12">
            <PageTransition>{children}</PageTransition>
          </main>
        </ProfileProvider>
      </body>
    </html>
  );
}
