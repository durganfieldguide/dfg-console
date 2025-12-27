export function makeRunId(worker: string) {
  return `${worker}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
