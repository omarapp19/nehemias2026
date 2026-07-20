"use client";

import dynamicImport from "next/dynamic";

/**
 * Next.js 15 no permite `ssr: false` en `next/dynamic` dentro de un Server
 * Component — hay que moverlo a un Client Component dedicado. `app/(public)/page.tsx`
 * (que es un Server Component async) importa este wrapper en su lugar.
 */
const ImpactMap = dynamicImport(() => import("@/components/impact-map"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-2xl bg-surface-sunken" />,
});

export default ImpactMap;
