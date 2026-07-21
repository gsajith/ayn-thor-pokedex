"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

/**
 * SPEC.md sizes the layout against this estimate, derived from the AYN Thor's
 * 1080x1240 panel and an assumed device pixel ratio. Issue #1 exists to replace
 * it with a measurement.
 */
const SPEC_ESTIMATE = { width: 360, height: 413 };

type Metrics = {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  screenWidth: number;
  screenHeight: number;
  visualWidth: number | null;
  visualHeight: number | null;
  standalone: boolean;
};

function read(): Metrics {
  const vv = window.visualViewport;
  return {
    cssWidth: window.innerWidth,
    cssHeight: window.innerHeight,
    dpr: window.devicePixelRatio,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    visualWidth: vv ? Math.round(vv.width) : null,
    visualHeight: vv ? Math.round(vv.height) : null,
    standalone: window.matchMedia("(display-mode: standalone)").matches,
  };
}

export default function Home() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    const update = () => setM(read());
    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  if (!m) {
    return (
      <main className={styles.page}>
        <p className={styles.measuring}>Measuring…</p>
      </main>
    );
  }

  const physicalWidth = Math.round(m.cssWidth * m.dpr);
  const physicalHeight = Math.round(m.cssHeight * m.dpr);
  const widthDelta = m.cssWidth - SPEC_ESTIMATE.width;
  const heightDelta = m.cssHeight - SPEC_ESTIMATE.height;
  const matchesSpec = Math.abs(widthDelta) <= 8 && Math.abs(heightDelta) <= 8;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Viewport</h1>

      <p className={styles.headline}>
        {m.cssWidth} <span className={styles.times}>×</span> {m.cssHeight}
        <span className={styles.unit}>css px</span>
      </p>

      <dl className={styles.rows}>
        <Row label="Device pixel ratio" value={String(m.dpr)} />
        <Row
          label="Physical (derived)"
          value={`${physicalWidth} × ${physicalHeight}`}
        />
        <Row label="Screen" value={`${m.screenWidth} × ${m.screenHeight}`} />
        <Row
          label="Visual viewport"
          value={
            m.visualWidth === null
              ? "unsupported"
              : `${m.visualWidth} × ${m.visualHeight}`
          }
        />
        <Row label="Display mode" value={m.standalone ? "standalone" : "browser"} />
      </dl>

      <section
        className={matchesSpec ? styles.verdictMatch : styles.verdictDiffer}
      >
        <p className={styles.verdictTitle}>
          {matchesSpec ? "Matches SPEC.md" : "Differs from SPEC.md"}
        </p>
        <p className={styles.verdictBody}>
          Estimate is {SPEC_ESTIMATE.width} × {SPEC_ESTIMATE.height}.{" "}
          {matchesSpec
            ? "Layout budget holds as written."
            : `Actual is ${formatDelta(widthDelta)} wide, ${formatDelta(
                heightDelta,
              )} tall. Update SPEC.md before building the grid.`}
        </p>
      </section>
    </main>
  );
}

function formatDelta(delta: number) {
  if (delta === 0) return "identical";
  return `${Math.abs(delta)}px ${delta > 0 ? "larger" : "smaller"}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}
