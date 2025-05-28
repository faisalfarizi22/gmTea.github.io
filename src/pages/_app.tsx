"use client"
import type { AppProps } from "next/app"
import Head from "next/head"
import Script from "next/script"
import "@/styles/globals.css"
import { ThirdwebProvider } from "thirdweb/react"
import { useRouter } from "next/router"
import Footer from "@/components/Footer"
import WalletRequired from "@/components/WalletRequired"
import { useWalletState } from "@/hooks/useWalletState"
import Navbar from "@/components/Navbar"
import { getChainConfig } from "@/utils/constants" // Import getChainConfig

function GMApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const { web3State, connectWallet, disconnectWallet, switchNetwork } = useWalletState()
  const { address, isConnected, isLoading: isWalletConnecting, chainId } = web3State
  
  const adaptedConnectWallet = async (): Promise<void> => {
    await connectWallet()
  }
  
  // Calculate network info for Navbar
  const currentNetwork = chainId ? getChainConfig(chainId) : null
  const networkInfo = currentNetwork ? {
    name: currentNetwork.chainName,
    logo: currentNetwork.logo
  } : null
  
  // Determine if the current route should be wrapped with WalletRequired
  const shouldRequireWallet = !router.pathname.includes("/auth") && !router.pathname.includes("/landing")
  
  return (
    <>
      <Head>
        <title>MultiChainGM - Blockchain Interactions</title>
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
      
      {/* Google Analytics */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=G-LCY12CWTZ4`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LCY12CWTZ4');
          `,
        }}
      />
     
      <ThirdwebProvider>
        {/* Navbar - Added here so it's present on all pages */}
        <Navbar 
          address={address}
          connectWallet={adaptedConnectWallet}
          disconnectWallet={disconnectWallet}
          isConnecting={isWalletConnecting}
          networkInfo={networkInfo}
        />
        
        <main>
          <WalletRequired
              isConnected={isConnected}
              connectWallet={adaptedConnectWallet}
              isConnecting={isWalletConnecting}
            >
          {shouldRequireWallet ? (
              <Component {...pageProps} />
            
          ) : (
            <Component {...pageProps} />
          )}
          </WalletRequired>
        </main>
      </ThirdwebProvider>
    </>
  )
}

export default GMApp