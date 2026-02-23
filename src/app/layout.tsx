import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: 'Mermaid Cloud Viz',
  description: 'Visualize and enhance Mermaid diagrams.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full font-body antialiased flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
