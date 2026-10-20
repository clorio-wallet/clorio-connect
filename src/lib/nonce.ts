/** The account endpoint already returns the next on-chain nonce. */
export function calculatePendingNonce(
  accountNonce: number,
  mempool: unknown,
  publicKey: string,
): { nonce: number; pendingNonce: number; mempoolCount: number } {
  if (!Number.isSafeInteger(accountNonce) || accountNonce < 0) {
    throw new Error('Invalid account nonce');
  }
  if (!Array.isArray(mempool)) {
    throw new Error('Invalid mempool response');
  }
  let mempoolCount = 0;
  let pendingNonce = accountNonce;

  for (const entry of mempool) {
    if (typeof entry !== 'object' || entry === null) continue;
    const tx = entry as Record<string, unknown>;
    const sender = ['sender', 'from', 'fromAddress', 'senderAddress', 'source']
      .map((key) => tx[key])
      .find((value) => typeof value === 'string' && value.length > 0);
    if (sender !== publicKey) continue;
    mempoolCount++;
    const nonce = typeof tx.nonce === 'number' ? tx.nonce
      : typeof tx.nonce === 'string' && tx.nonce.trim() ? Number(tx.nonce) : NaN;
    if (!Number.isSafeInteger(nonce) || nonce < 0 || nonce >= Number.MAX_SAFE_INTEGER) {
      throw new Error('Invalid outgoing mempool nonce');
    }
    pendingNonce = Math.max(pendingNonce, nonce + 1);
  }

  return { nonce: accountNonce, pendingNonce, mempoolCount };
}
