"use client"

import { useCallback, type RefObject } from "react"
import { useRouter } from "next/router"

export const useScrollFunctions = (
  leaderboardRef?: RefObject<HTMLDivElement>,
  badgeMintSectionRef?: RefObject<HTMLDivElement>,
) => {
  const router = useRouter()

  // Function to scroll to leaderboard
  const scrollToLeaderboard = useCallback(() => {
    // If we're not on the home page, navigate there first
    if (router.pathname !== "/") {
      router.push("/").then(() => {
        // After navigation, find the leaderboard element and scroll to it
        setTimeout(() => {
          const leaderboardElement =
            document.querySelector('[data-section="leaderboard"]') || document.getElementById("leaderboard-section")

          if (leaderboardElement) {
            const navbarHeight = 80 // Approximate height of navbar
            const yOffset = -navbarHeight
            const y = leaderboardElement.getBoundingClientRect().top + window.pageYOffset + yOffset

            window.scrollTo({
              top: y,
              behavior: "smooth",
            })
          }
        }, 500) // Longer timeout to ensure page is loaded
      })
    } else if (leaderboardRef?.current) {
      // If we're already on the home page and have a ref, use it
      setTimeout(() => {
        leaderboardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 100)
    } else {
      // Fallback if we're on the home page but don't have a ref
      setTimeout(() => {
        const leaderboardElement =
          document.querySelector('[data-section="leaderboard"]') || document.getElementById("leaderboard-section")

        if (leaderboardElement) {
          const navbarHeight = 80
          const yOffset = -navbarHeight
          const y = leaderboardElement.getBoundingClientRect().top + window.pageYOffset + yOffset

          window.scrollTo({
            top: y,
            behavior: "smooth",
          })
        }
      }, 100)
    }
  }, [router, leaderboardRef])

  // Function to scroll to badge mint section
  const scrollToMintSection = useCallback(() => {
    // If we're not on the home page, navigate there first
    if (router.pathname !== "/") {
      router.push("/").then(() => {
        // After navigation, find the badge mint section and scroll to it
        setTimeout(() => {
          const badgeSection =
            document.querySelector(".badge-mint-section") || document.querySelector('[data-section="badge-mint"]')

          if (badgeSection) {
            const navbarHeight = 80
            const yOffset = -navbarHeight
            const y = badgeSection.getBoundingClientRect().top + window.pageYOffset + yOffset

            window.scrollTo({
              top: y,
              behavior: "smooth",
            })
          }
        }, 500) // Longer timeout to ensure page is loaded
      })
    } else if (badgeMintSectionRef?.current) {
      // If we're already on the home page and have a ref, use it
      setTimeout(() => {
        const navbarHeight = 80
        const yOffset = -navbarHeight

        if (badgeMintSectionRef.current) {
          const element = badgeMintSectionRef.current
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset

          window.scrollTo({
            top: y,
            behavior: "smooth",
          })
        }
      }, 100)
    } else {
      // Fallback if we're on the home page but don't have a ref
      setTimeout(() => {
        const badgeSection =
          document.querySelector(".badge-mint-section") || document.querySelector('[data-section="badge-mint"]')

        if (badgeSection) {
          const navbarHeight = 80
          const yOffset = -navbarHeight
          const y = badgeSection.getBoundingClientRect().top + window.pageYOffset + yOffset

          window.scrollTo({
            top: y,
            behavior: "smooth",
          })
        }
      }, 100)
    }
  }, [router, badgeMintSectionRef])

  return {
    scrollToLeaderboard,
    scrollToMintSection,
  }
}
