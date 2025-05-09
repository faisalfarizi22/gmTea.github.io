"use client"

import { motion, AnimatePresence } from "framer-motion"
import { FaTimes } from "react-icons/fa"

export type NotificationType = "success" | "error" | "info" | "warning"

export interface Notification {
  id: string
  message: string
  type: NotificationType
}

interface ProfileNotificationsProps {
  notifications: Notification[]
  removeNotification: (id: string) => void
}

export default function ProfileNotifications({ 
  notifications, 
  removeNotification 
}: ProfileNotificationsProps) {
  return (
    <div className="fixed top-20 right-8 z-50 space-y-3 flex flex-col items-end">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className={`max-w-md rounded-lg shadow-lg overflow-hidden backdrop-blur-sm ${
              notification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/60 border-l-4 border-emerald-500"
                : notification.type === "error"
                ? "bg-red-50 dark:bg-red-900/60 border-l-4 border-red-500"
                : notification.type === "info"
                ? "bg-blue-50 dark:bg-blue-900/60 border-l-4 border-blue-500"
                : "bg-yellow-50 dark:bg-orange-900/60 border-l-4 border-orange-500"
            }`}
          >
            <div className="p-4 flex">
              <div className="ml-3 flex-1">
                <p
                  className={`text-sm font-medium ${
                    notification.type === "success"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : notification.type === "error"
                      ? "text-red-700 dark:text-red-300"
                      : notification.type === "info"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-yellow-700 dark:text-orange-300"
                  }`}
                >
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-4 inline-flex text-gray-400 focus:outline-none focus:text-gray-500 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800/50"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
            {/* Animated progress bar */}
            <div className="h-1 bg-gray-200 dark:bg-emerald-500/30 relative">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className={`absolute top-0 left-0 h-full ${
                  notification.type === "success"
                    ? "bg-emerald-500"
                    : notification.type === "error"
                    ? "bg-red-500"
                    : notification.type === "info"
                    ? "bg-blue-500"
                    : "bg-orange-500"
                }`}
              ></motion.div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}