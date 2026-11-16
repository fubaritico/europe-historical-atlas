import type { ReactNode } from 'react'

/**
 * One section of a city's detail (the dev's screen of 2026-11-16): its heading, then what it says under it.
 * @param props - the heading and the content
 * @param props.title - the heading
 * @param props.children - what the section says
 * @returns the section
 */
export function CityDetailSection({ title, children }: { title: string; children: ReactNode }) {
  // Render
  return (
    <div className="city-detail__section">
      <h3 className="city-detail__heading">{title}</h3>
      {children}
    </div>
  )
}
