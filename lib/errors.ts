export function createPublicDataError(
  error: unknown,
  publicMessage: string
): Error {
  return new Error(publicMessage, { cause: error });
}
