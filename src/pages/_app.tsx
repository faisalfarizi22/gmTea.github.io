import React from 'react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';
import { ThirdwebProvider } from "thirdweb/react";

function GMApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>GMTEA - Daily Web3 Check-ins</title>
        <meta name="description" content="Daily GM check-ins on the Tea Sepolia Testnet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <ThirdwebProvider>
        <Component {...pageProps} />
      </ThirdwebProvider>
    </>
  );
}

export default GMApp;