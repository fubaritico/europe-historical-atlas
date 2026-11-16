/**
 * A city's detail read as the tests compare it: each section « Heading: what it says », its lines joined by « ; »,
 * then the verdict.
 * @param region - the detail, its region
 * @returns the sections, in order, and the verdict last when there is one
 */
export function cityDetailText(region: HTMLElement): string[] {
  const sections = [...region.querySelectorAll('.city-detail__section')].map((section) => {
    const heading = section.querySelector('.city-detail__heading')?.textContent ?? ''
    const lines = [...section.querySelectorAll('p, li')].map((line) => line.textContent)
    return `${heading}: ${lines.join('; ')}`
  })
  const verdict = region.querySelector('.city-detail__verdict')?.textContent
  return verdict === undefined || verdict === null ? sections : [...sections, verdict]
}
