export function stripAccents(value) {
  return String(value).normalize('NFD').replace(/\p{M}/gu, '')
}
