"use client"
import type { AppProps } from "next/app"
import Head from "next/head"
import "@/styles/globals.css"
import { ThirdwebProvider } from "thirdweb/react"
import { useRouter } from "next/router"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import WalletRequired from "@/components/WalletRequired"
import { useWalletState } from "@/hooks/useWalletState"
import { useScrollFunctions } from "@/hooks/useScrollFunctions"
import { SpeedInsights } from "@vercel/speed-insights/next"

function GMApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const { web3State, connectWallet, disconnectWallet, switchNetwork } = useWalletState()
  const { scrollToLeaderboard, scrollToMintSection } = useScrollFunctions()

  const { address, isConnected, isLoading: isWalletConnecting } = web3State

  const adaptedConnectWallet = async (): Promise<void> => {
    await connectWallet()
  }

  // Determine if the current route should be wrapped with WalletRequired
  const shouldRequireWallet = !router.pathname.includes("/auth") && !router.pathname.includes("/landing")

  return (
    <>
      <Head>
        <title>GMTEA - Daily Web3 Check-ins</title>
        <meta name="description" content="Daily GM check-ins on the Tea Sepolia Testnet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <ThirdwebProvider>
        <SpeedInsights/>
        <Navbar
          address={address}
          connectWallet={adaptedConnectWallet}
          disconnectWallet={disconnectWallet}
          isConnecting={isWalletConnecting}
          scrollToLeaderboard={scrollToLeaderboard}
          scrollToMintSection={scrollToMintSection}
        />

        <main>
          {shouldRequireWallet ? (
            <WalletRequired
              isConnected={isConnected}
              connectWallet={adaptedConnectWallet}
              isConnecting={isWalletConnecting}
            >
              <Component {...pageProps} />
            </WalletRequired>
          ) : (
            <Component {...pageProps} />
          )}
        </main>

        <Footer scrollToLeaderboard={scrollToLeaderboard} scrollToMintSection={scrollToMintSection} />
      </ThirdwebProvider>
    </>
  )
}

export default GMApp
