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
      <div className="space-y-4">
        {/* Contracts section with Coming Soon overlay */}
        <div className="relative">
          {/* Coming Soon Overlay for Contracts */}
          <div className="absolute inset-0 z-20 backdrop-blur-md bg-emerald-900/40 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <h2 className="text-emerald-300 text-2xl font-bold tracking-wider">COMING SOON</h2>
              <p className="text-emerald-200/80 mt-1 text-sm">Profile Page details under development</p>
            </div>
          </div>
      <ProfilePage />
      </div>
      </div>
    </>
  )
}