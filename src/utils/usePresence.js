import { useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, set, onDisconnect, serverTimestamp, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

let initialized = false;

export default function usePresence() {
  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const connectedRef = ref(database, ".info/connected");
    let currentRef = null;
    let disconnectRef = null;

    const writePresence = (uid) => {
      // Remove previous entry if uid changed
      if (currentRef) {
        set(currentRef, null);
      }

      const key = uid || "anon_" + Math.random().toString(36).slice(2, 8);
      currentRef = ref(database, `presence/${key}`);

      onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          if (disconnectRef) disconnectRef.cancel();
          disconnectRef = onDisconnect(currentRef);
          disconnectRef.remove();
          set(currentRef, {
            online: true,
            uid: uid || "anon",
            lastSeen: serverTimestamp(),
          });
        }
      });
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      writePresence(user ? user.uid : null);
    });

    return () => {
      unsub();
      if (currentRef) set(currentRef, null);
    };
  }, []);
}
