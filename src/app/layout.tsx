import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ember Bio",
  description: "Biotech data intelligence for scientists",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
