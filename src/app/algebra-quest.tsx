"use client";

import { useEffect } from "react";

// The game is an imperative DOM app (see src/game/app.js). It renders into #app
// and #confettiCanvas, so it must load after those elements are mounted and
// only in the browser. The module mounts itself once; the guard keeps React
// strict-mode's double effect from booting it twice.
let booted = false;

export default function AlgebraQuest() {
  useEffect(() => {
    if (booted) return;
    booted = true;
    import("@/game/app.js").then((m) => m.boot());
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      <div id="app" />
      <canvas id="confettiCanvas" />
    </>
  );
}
