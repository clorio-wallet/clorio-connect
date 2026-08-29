import { useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/wallet/password-input';
import { Label } from '@/components/ui/label';
import {
  createPaperWalletPdf,
  isValidPaperWalletPdfPassword,
} from '@/lib/paper-wallet';
import type {
  PaperWalletPayload,
  TakePaperWalletMessage,
  TakePaperWalletResponse,
} from '@/messages/types';

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
  const [downloaded, setDownloaded] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleCreatePdf = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data) return;

    if (!isValidPaperWalletPdfPassword(password)) {
      setError(
        t(
          'security.backup.pdf_password_too_short',
          'Use at least 8 characters for the PDF password.',
        ),
      );
      return;
    }

    setError('');
    setIsGenerating(true);
    try {
      const pdf = await createPaperWalletPdf(data, password);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Clorio-Paperwallet.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setData(null);
      setPassword('');
      setDownloaded(true);
      document.title = 'Clorio';
    } catch {
      setError(
        t(
          'security.backup.pdf_generation_failed',
          'Could not generate the protected PDF. Please try again.',
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (failed || downloaded) {
    return (
      <main className="min-h-screen grid place-items-center p-8 text-center">
        <p>
          {downloaded
            ? t(
                'security.backup.pdf_downloaded',
                'Protected PDF downloaded. Store it securely.',
              )
            : t('security.backup.unavailable')}
        </p>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">
            {t('security.backup.paper_title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              'security.backup.pdf_password_warning',
              'This PDF contains your recovery phrase and private key. It will be protected with a separate PDF password.',
            )}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleCreatePdf}>
          <div className="space-y-2">
            <Label htmlFor="paper-wallet-pdf-password">
              {t('security.backup.pdf_password_label', 'PDF password')}
            </Label>
            <PasswordInput
              id="paper-wallet-pdf-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              placeholder={t(
                'security.backup.pdf_password_placeholder',
                'Enter a separate password',
              )}
              autoComplete="new-password"
              error={error}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {t(
                'security.backup.pdf_password_hint',
                'This password is not saved and is different from your wallet password.',
              )}
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isGenerating || !password}
          >
            <LockKeyhole className="h-4 w-4 mr-2" />
            {isGenerating
              ? t('security.backup.pdf_generating', 'Creating protected PDF...')
              : t('security.backup.pdf_create_button', 'Create protected PDF')}
          </Button>
        </form>
      </div>
    </main>
  );
}
