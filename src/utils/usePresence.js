import { useEffect } from "react";
import { loadDatabase, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getPresenceTabId, getVisitorId } from "./visitorIdentity";

export default function usePresence(page = "/") {
  useEffect(() => {
    let cancelled = false;
    let set = null;
    let unsub = null;
    let removeConnectionListener = null;
    let heartbeat = null;
    let currentRef = null;
    let onVisibilityChange = null;

    // El SDK de Realtime Database (~130 KB) se descarga recién aquí, fuera del bundle inicial.
    const timer = setTimeout(() => loadDatabase().then((rtdb) => {
      if (cancelled || !rtdb) return;
      const { database, ref, onDisconnect, serverTimestamp, onValue } = rtdb;
      set = rtdb.set;
      const connectedRef = ref(database, ".info/connected");
      let disconnectRef = null;

      const visitorId = getVisitorId();
      const tabId = getPresenceTabId();
      let currentUser = auth.currentUser;

      const touch = () => {
        if (!currentRef) return;
        set(currentRef, {
          online: true,
          uid: currentUser?.uid || "anon",
          visitorId,
          page,
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      };

      const writePresence = (uid) => {
        currentUser = uid ? auth.currentUser : null;
        if (currentRef) {
          set(currentRef, null);
        }

        const identity = uid || visitorId;
        currentRef = ref(database, `presence/${identity}/${tabId}`);

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

      unsub = onAuthStateChanged(auth, (user) => {
        writePresence(user ? user.uid : null);
      });
      heartbeat = window.setInterval(touch, 30000);
      onVisibilityChange = () => { if (!document.hidden) touch(); };
      document.addEventListener("visibilitychange", onVisibilityChange);
    }).catch(() => {}), 4000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (unsub) unsub();
      if (removeConnectionListener) removeConnectionListener();
      if (heartbeat) window.clearInterval(heartbeat);
      if (onVisibilityChange) document.removeEventListener("visibilitychange", onVisibilityChange);
      if (currentRef && set) set(currentRef, null);
    };
  }, [page]);
}
