import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CryptoSignal Terminal',
  description: 'Crypto trading terminal with social signal overlay',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}
