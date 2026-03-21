import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Phoenix Trading System',
  description: 'Advanced AI-powered trading platform - v2.0',
  keywords: ['trading', 'AI', 'finance', 'stocks', 'crypto'],
  authors: [{ name: 'Phoenix Trading Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                },
                success: {
                  iconTheme: {
                    primary: 'hsl(var(--success))',
                    secondary: 'hsl(var(--success-foreground))',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'hsl(var(--error))',
                    secondary: 'hsl(var(--error-foreground))',
                  },
                },
              }}
            />
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
