import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import config from "@/config";
import { ClarityProvider } from "@/components/global/Clarity";
import { ThemeProvider } from "@/components/global/ThemeProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: config.appName,
    template: `%s - ${config.appName}`,
  },
  description: config.appDescription,
  keywords: [
    "public services",
    "government schemes",
    "civic information",
    "public benefits",
    "welfare schemes",
    "government rights",
    "public assistance",
  ],
  authors: [{ name: config.founder.name }],
  creator: config.founder.name,
  metadataBase: new URL(config.appUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: config.appUrl,
    title: config.appName,
    description: config.appDescription,
    siteName: config.appName,
  },
  twitter: {
    card: "summary_large_image",
    title: config.appName,
    description: config.appDescription,
    creator: config.founder.social.twitter.replace("https://twitter.com/", "@"),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClarityProvider projectId={clarityProjectId}>
            {children}
          </ClarityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
