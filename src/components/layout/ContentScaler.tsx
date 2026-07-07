"use client"

import { useSyncExternalStore } from "react"
import { useFontSizeStore, FONT_SIZE_SCALE } from "@/store/fontSizeStore"

export function ContentScaler({ children }: { children: React.ReactNode }) {
  const fontSize = useFontSizeStore((s) => s.fontSize)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const scale = mounted ? FONT_SIZE_SCALE[fontSize] : 1

  return (
    <div
      className="p-10"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: `${100 / scale}%`,
      }}
    >
      {children}
    </div>
  )
}
