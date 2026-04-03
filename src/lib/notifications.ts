import { db } from "../firebase";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./firebase-utils";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("Push notifications are not supported in this browser");
    return;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return;
    }

    // Get Service Worker Registration
    const registration = await navigator.serviceWorker.ready;

    // Standard VAPID public key
    const publicVapidKey = "BIJQObXWpMqW1nYXUX3b4icKnyLwcPNU2-qXJOUuUOX68wQ2BlYWyILatrP_LB2xyOzOfWih8Ott31nsdXuOYX0";
    const applicationServerKey = urlBase64ToUint8Array(publicVapidKey);

    // Subscribe to Push
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Unsubscribe existing to avoid InvalidStateError with different keys
      console.log("Unsubscribing from existing push subscription...");
      const unsubscribed = await subscription.unsubscribe();
      if (unsubscribed) {
        console.log("Successfully unsubscribed.");
      } else {
        console.warn("Failed to unsubscribe. This might cause issues with the new subscription.");
      }
      // Wait a tiny bit to ensure the browser clears the state
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log("Subscribing to push with new key...");
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
    } catch (subErr: any) {
      console.error("Initial subscribe failed:", subErr);
      if (subErr.name === 'InvalidStateError') {
        console.log("Attempting to unregister service worker as a fallback...");
        await registration.unregister();
        console.log("Service worker unregistered. Please reload the page.");
        alert("通知設定をリセットしました。ページを再読み込みしてください。");
        window.location.reload();
        return false;
      }
      throw subErr;
    }

    console.log("Push Subscription obtained:", subscription);
    
    // Register subscription with Firestore
    try {
      await setDoc(doc(db, "users", userId), {
        subscriptions: arrayUnion(JSON.parse(JSON.stringify(subscription)))
      }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`));
    } catch (error) {
      console.error("Failed to save subscription to Firestore", error);
    }
    
    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}

export function setupForegroundNotifications() {
  // Standard Web Push handles notifications in the service worker.
}
