import { useState } from "react"

export type NotificationType = "success" | "error" | "info" | "warning"

export interface Notification {
  id: string
  message: string
  type: NotificationType
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Add a new notification
  const addNotification = (message: string, type: NotificationType) => {
    const id = Math.random().toString(36).substring(2, 9)
    setNotifications((prev) => [...prev, { id, message, type }])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 5000)
  }

  // Remove a notification by id
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return {
    notifications,
    addNotification,
    removeNotification
  }
}