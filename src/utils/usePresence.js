import { useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, set, onDisconnect, serverTimestamp, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

// Generate or retrieve unique session key for anonymous users
const getSessionKey = () => {
  let key = sessionStorage.getItem('ps_presence_key');
  if (!key) {
    key = 'sess_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('ps_presence_key', key);
  }
  return key;
};

export default function usePresence() {
  useEffect(() => {
    const connectedRef = ref(database, ".info/connected");
    let currentRef = null;
    let disconnectRef = null;
    let removeConnectionListener = null;
    let heartbeat = null;

    const touch = () => {
      if (!currentRef) return;
      // A presence entry is only considered live while it is refreshed. This
      // avoids counting abandoned tabs left behind by an interrupted network.
      set(currentRef, {
        online: true,
        uid: auth.currentUser?.uid || "anon",
        lastSeen: serverTimestamp(),
      }).catch(() => {});
    };

    const writePresence = (uid) => {
      // Remove previous entry if uid changed
      if (currentRef) {
        set(currentRef, null);
      }

      const key = uid || getSessionKey();
      currentRef = ref(database, `presence/${key}`);

      if (removeConnectionListener) removeConnectionListener();
      removeConnectionListener = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          if (disconnectRef) disconnectRef.cancel();
          disconnectRef = onDisconnect(currentRef);
          disconnectRef.remove();
          touch();
        }
      });
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      writePresence(user ? user.uid : null);
    });
    heartbeat = window.setInterval(touch, 30000);
    const onVisibilityChange = () => { if (!document.hidden) touch(); };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsub();
      if (removeConnectionListener) removeConnectionListener();
      if (heartbeat) window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (currentRef) set(currentRef, null);
    };
  }, []);
}
