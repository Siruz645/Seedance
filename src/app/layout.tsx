import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Seedance Studio Pro | AI Video Generation & OpenRouter Storyboard',
  description: 'Профессиональная ИИ видео-студия генерации видео ByteDance Seedance и интеграции OpenRouter API',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="antialiased min-h-screen bg-studio-900 text-gray-100 flex flex-col bg-studio-grid">
        {children}
      </body>
    </html>
  );
}
