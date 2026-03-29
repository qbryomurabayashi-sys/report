import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";

export async function subscribeToPush(userId: string) {
  if (!messaging) return;

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return;
    }

    // Get FCM Token
    // Note: VAPID key is optional but recommended. Using the existing one if available.
    const token = await getToken(messaging, {
      vapidKey: "BIJQObXWpMqW1nYXUX3b4icKnyLwcPNU2-qXJOUuUOX68wQ2BlYWyILatrP_LB2xyOzOfWih8Ott31nsdXuOYX0"
    });

    if (token) {
      console.log("FCM Token obtained:", token);
      
      // Register token with our server
      await fetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ 
          subscription: { endpoint: token, keys: {} }, // Mocking subscription object for existing server logic
          userId,
          fcmToken: token 
        }),
        headers: {
          'content-type': 'application/json'
        }
      });
      
      return true;
    }
  } catch (err) {
    console.error("FCM subscription failed:", err);
    return false;
  }
}

export function setupForegroundNotifications() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    
    // Display notification using browser API
    if (Notification.permission === "granted") {
      new Notification(payload.notification?.title || "新着通知", {
        body: payload.notification?.body,
        icon: "/icon.svg"
      });
    }

    // Update badge
    if ("setAppBadge" in navigator) {
      (navigator as any).setAppBadge(1);
    }
  });
}
