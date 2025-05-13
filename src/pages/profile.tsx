"use client"

import { useEffect } from "react"
import Head from "next/head"
import ProfilePage from "@/components/profile/ProfilePage"

export default function ProfilePageRoute() {
  // Effect to scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <Head>
        <title>Digital Profile | GM TEA</title>
        <meta name="description" content="View your GM TEA profile and digital credentials" />
        <meta property="og:title" content="Digital Profile | GM TEA" />
        <meta property="og:description" content="View your GM TEA digital profile, badges, and achievements" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Digital Profile | GM TEA" />
        <meta name="twitter:description" content="View your GM TEA digital profile, badges, and achievements" />
      </Head>

      {/* ProfilePage component handles all the profile UI and logic */}
      <ProfilePage />
    
    </>
  )
}