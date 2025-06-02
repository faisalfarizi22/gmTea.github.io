"use client"

import { useCallback, type RefObject } from "react"
import { useRouter } from "next/router"

export const useScrollFunctions = (
  leaderboardRef?: RefObject<HTMLDivElement>,
  badgeMintSectionRef?: RefObject<HTMLDivElement>,
) => {
  const router = useRouter()

  const scrollToLeaderboard = useCallback(() => {
    if (router.pathname !== "/") {
      router.push("/").then(() => {
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
        }, 500)
      })
    } else if (leaderboardRef?.current) {
      setTimeout(() => {
        leaderboardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 100)
    } else {
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

  const scrollToMintSection = useCallback(() => {
    if (router.pathname !== "/") {
      router.push("/").then(() => {
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
        }, 500)
      })
    } else if (badgeMintSectionRef?.current) {
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