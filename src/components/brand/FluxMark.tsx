import type { SVGProps } from "react"

export function FluxMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5 3h14v4.5H9v1.7l-4 3V3Z" />
      <path d="m5 13.7 4.4-3.4H18v4.2H9V21H5v-7.3Z" />
    </svg>
  )
}
