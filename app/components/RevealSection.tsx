"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  className?: string;
  eager?: boolean;
  children: React.ReactNode;
};

export default function RevealSection({
  className = "",
  eager = false,
  children,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    if (eager) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [eager]);

  return (
    <section
      ref={ref}
      className={`${className} reveal-section ${visible ? "reveal-section--visible" : ""}`}
    >
      {children}
    </section>
  );
}
