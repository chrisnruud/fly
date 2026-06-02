// Data stores names as "LASTNAME/FIRSTNAME"; render them human-friendly.
export function displayName(raw: string): string {
  if (!raw) return ''
  const [last, first] = raw.split('/')
  const titled = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ')
  if (first) return `${titled(first)} ${titled(last)}`
  return titled(last)
}
