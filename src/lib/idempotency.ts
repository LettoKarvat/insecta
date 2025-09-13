export function generateIdempotencyKey() {
  const rnd = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? (crypto as any).randomUUID()
    : `idemp_${Date.now()}_${Math.random().toString(36).slice(2)}`
  return rnd
}
