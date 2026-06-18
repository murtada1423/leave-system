export function getCleanEmail(fullName: string): string {
  let hash = 0
  const str = fullName.trim()
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return `user_${Math.abs(hash)}@leave.system`
}
