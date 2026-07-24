import type {
  PaperWalletPayload,
  StorePaperWalletMessage,
  StorePaperWalletResponse,
} from '@/messages/types';

export async function openPaperWallet(data: PaperWalletPayload): Promise<void> {
  const token = crypto.randomUUID();
  const message: StorePaperWalletMessage = {
    type: 'STORE_PAPER_WALLET',
    payload: { token, data },
  };
  const response = (await chrome.runtime.sendMessage(
    message,
  )) as StorePaperWalletResponse;

  if (!response?.ok) {
    throw new Error(
      response?.error || 'Reload the Clorio extension, then try again.',
    );
  }

  await chrome.tabs.create({
    url: chrome.runtime.getURL(
      `src/popup/index.html#/paper-wallet?token=${token}`,
    ),
    active: true,
  });
}
