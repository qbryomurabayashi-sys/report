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
      await subscription.unsubscribe();
    }

    console.log("Subscribing to push with new key...");
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    console.log("Push Subscription obtained:", subscription);
    
    // Register subscription with our server
    await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify({ 
        subscription,
        userId
      }),
      headers: {
        'content-type': 'application/json'
      }
    });
    
    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}

export function setupForegroundNotifications() {
  // Standard Web Push handles notifications in the service worker.
}
