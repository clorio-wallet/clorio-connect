import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaperWallet } from '@/components/wallet/paper-wallet';
import type {
  PaperWalletPayload,
  TakePaperWalletMessage,
  TakePaperWalletResponse,
} from '@/messages/types';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';

const TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function PaperWalletPrintPage() {
  const { t } = useTranslation();
  const token = new URLSearchParams(window.location.hash.split('?')[1]).get(
    'token',
  );
  const hasValidToken = !!token && TOKEN_PATTERN.test(token);
  const [data, setData] = useState<PaperWalletPayload | null>(null);
  const [failed, setFailed] = useState(!hasValidToken);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    if (!token || !hasValidToken) return;

    const message: TakePaperWalletMessage = {
      type: 'TAKE_PAPER_WALLET',
      payload: { token },
    };
    void chrome.runtime
      .sendMessage(message)
      .then((response: TakePaperWalletResponse) => {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}#/paper-wallet`,
        );
        if (!response.data) {
          setFailed(true);
          return;
        }
        document.title = `${response.data.name} - Clorio Paper Wallet`;
        setData(response.data);
      })
      .catch(() => setFailed(true));
  }, [hasValidToken, token]);

  useEffect(() => {
    if (!data) return;
    const clearCredentials = () => {
      setData(null);
      setPrinted(true);
      document.title = 'Clorio';
    };
    window.addEventListener('afterprint', clearCredentials, { once: true });
    const timer = window.setTimeout(() => window.print(), 250);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', clearCredentials);
    };
  }, [data]);

  if (failed || printed) {
    return (
      <main className="min-h-screen grid place-items-center p-8 text-center">
        <p>
          {printed
            ? t('security.backup.done')
            : t('security.backup.unavailable')}
        </p>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen grid place-items-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">
          {t('security.backup.paper_title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('security.backup.paper_warning')}
        </p>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          {t('security.backup.print_pdf')}
        </Button>
      </div>
      <PaperWallet {...data} />
    </main>
  );
}
