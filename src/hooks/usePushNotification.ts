import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Helper to convert base64 url string to Uint8Array for VAPID
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

export function usePushNotification() {
  const { user, role } = useAuth();

  useEffect(() => {
    // Only proceed if user is logged in, has a role, and push is supported
    if (!user || !role || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    const registerPush = async () => {
      try {
        // Register the service worker
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        await navigator.serviceWorker.ready;

        // Check current subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          // Ask for permission if not already granted
          if (Notification.permission !== 'granted') {
            const permissionResult = await Notification.requestPermission();
            if (permissionResult !== 'granted') return;
          }

          // Subscribe the user
          const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (!vapidKey) {
            console.error('VITE_VAPID_PUBLIC_KEY is not set');
            return;
          }

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey)
          });
        }

        // Save the subscription to Supabase
        const subJson = subscription.toJSON();
        
        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          role: role, // 'partner' or 'admin'
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          updated_at: new Date().toISOString()
        }, { onConflict: 'endpoint' });

      } catch (err) {
        console.error('Failed to register push notification:', err);
      }
    };

    registerPush();
  }, [user, role]);
}
