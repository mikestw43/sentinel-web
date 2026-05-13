import type { Metadata } from 'next'
import { VT323, Share_Tech_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
  display: 'swap',
})

const shareTechMono = Share_Tech_Mono({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-share-tech-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SENTINEL — MT5 Trading Dashboard',
  description: 'MT5 Trading Dashboard by InterStellar Financial Group',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${vt323.variable} ${shareTechMono.variable}`}>
      <body className="h-full bg-[#040d1a] font-mono">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}