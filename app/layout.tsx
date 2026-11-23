import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";
export const metadata: Metadata = { title: { default: "DeepamVote.in | People's Voice for Karthigai Deepam", template: "%s | DeepamVote.in" }, description: "Share your perspective on Karthigai Deepam at Thiruparankundram. An independent platform for respectful, transparent paid participation." };
export default function RootLayout({ children }: Readonly<{
    children: React.ReactNode;
}>) {
    return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><Header />{children}<Footer /></body></html>;
}
