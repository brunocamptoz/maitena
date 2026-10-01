import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s — Panel Maitena" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-1 flex-col bg-paper text-ink">{children}</div>;
}
