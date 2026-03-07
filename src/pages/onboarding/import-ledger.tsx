import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  HardDrive,
  XCircle,
  WifiOff,
  AppWindow,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LedgerConnectStep } from '@/components/ledger/ledger-connect-step';
import { useLedger } from '@/hooks/use-ledger';
import { LedgerStatus, LedgerError, LedgerErrorKind } from '@/lib/ledger';
import { useWalletStore } from '@/stores/wallet-store';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import { CryptoService } from '@/lib/crypto';
import { storage, sessionStorage } from '@/lib/storage';
import { useSettingsStore } from '@/stores/settings-store';
import type {
  LedgerImportAccountMessage,
  LedgerImportAccountResponse,
} from '@/messages/types';

type Step = 'connect' | 'confirm' | 'done';

const DEFAULT_ACCOUNT_NAME = 'Ledger Account';
const DEFAULT_ACCOUNT_INDEX = 0;

export function ImportLedgerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setWallet } = useWalletStore();
  const { tempPassword, setIsAuthenticated, setHasVault, setTempPassword } = useSessionStore();

  const {
    status,
    isChecking,
    isImporting,
    connect,
    checkStatus,
    importAddress,
  } = useLedger();

  const [step, setStep] = React.useState<Step>('connect');
  const [accountName, setAccountName] = React.useState(DEFAULT_ACCOUNT_NAME);
  const [accountIndex, setAccountIndex] = React.useState(DEFAULT_ACCOUNT_INDEX);
  const [importedKey, setImportedKey] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [importError, setImportError] = React.useState<LedgerError | null>(
    null,
  );

  const hdPathDisplay = `m / 44' / 12586' / ${accountIndex}' / 0 / 0`;

  const handleConnect = React.useCallback(async () => {
    console.log('[import-ledger] handleConnect — START');
    try {
      const result = await connect();
      console.log('[import-ledger] handleConnect — connect() returned:', result.status, '| app:', result.app ? 'present' : 'null');
      if (result.status === LedgerStatus.READY) {
        console.log('[import-ledger] handleConnect — status is READY, transitioning to "confirm" step');
        setStep('confirm');
      } else {
        console.warn('[import-ledger] handleConnect — status is NOT READY:', result.status);
      }
    } catch (err) {
      console.error('[import-ledger] handleConnect — threw:', err);
    }
  }, [connect]);

  const handleCheckStatus = React.useCallback(async () => {
    console.log('[import-ledger] handleCheckStatus — START');
    try {
      const result = await checkStatus();
      console.log('[import-ledger] handleCheckStatus — result:', result.status);
      if (result.status === LedgerStatus.READY) {
        setStep('confirm');
      }
    } catch (err) {
      console.error('[import-ledger] handleCheckStatus — threw:', err);
    }
  }, [checkStatus]);

  const handleImport = React.useCallback(async () => {
    const index = Math.max(0, Math.floor(accountIndex));
    console.log('[import-ledger] handleImport — START, accountIndex:', index);
    setImportError(null);

    let result: Awaited<ReturnType<typeof importAddress>>;
    try {
      result = await importAddress(index);
      console.log('[import-ledger] handleImport — importAddress returned:', {
        publicKey: result.publicKey ? result.publicKey.slice(0, 12) + '…' : 'null',
        rejected: result.rejected,
        error: result.error,
      });
    } catch (err) {
      console.error('[import-ledger] handleImport — importAddress threw:', err);
      setImportError(
        LedgerError.disconnected(
          err instanceof Error ? err.message : 'Communication error',
        ),
      );
      return;
    }

    if (result.rejected) {
      // Rejection is user-initiated — show an inline banner so they can retry
      // without losing the account name / index they already configured.
      setImportError(LedgerError.rejected(t('ledger.errors.rejected_desc')));
      return;
    }

    if (!result.publicKey) {
      // Device/communication error — classify and show inline banner
      const errMsg = result.error ?? t('ledger.import.error_read');
      const isNotOpen =
        errMsg.toLowerCase().includes('app') ||
        errMsg.toLowerCase().includes('open');
      setImportError(
        isNotOpen
          ? LedgerError.appNotOpen(t('ledger.errors.app_not_open_desc'))
          : LedgerError.disconnected(t('ledger.errors.disconnected_desc')),
      );
      return;
    }

    console.log('[import-ledger] handleImport — SUCCESS, publicKey:', result.publicKey!.slice(0, 12) + '…');
    setImportedKey(result.publicKey);
    setStep('done');
  }, [accountIndex, importAddress, t]);

  // Clear the import error whenever the user changes account index or name
  const handleAccountIndexChange = React.useCallback((val: number) => {
    setAccountIndex(val);
    setImportError(null);
  }, []);

  const handleSave = React.useCallback(async () => {
    console.log('[import-ledger] handleSave — START, importedKey:', importedKey ? importedKey.slice(0, 12) + '…' : 'null', '| tempPassword:', tempPassword ? 'present' : 'null');
    if (!importedKey) {
      console.warn('[import-ledger] handleSave — no importedKey, aborting');
      return;
    }
    if (!tempPassword) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('onboarding.create.error_password'),
      });
      navigate('/');
      return;
    }

    setIsSaving(true);

    try {
      const finalAccountName = accountName.trim() || DEFAULT_ACCOUNT_NAME;
      console.log('[import-ledger] handleSave — encrypting vault for:', finalAccountName, '| accountIndex:', accountIndex);

      const encryptedData = await CryptoService.encrypt(importedKey, tempPassword);
      await storage.set('clorio_vault', {
        encryptedSeed: encryptedData.ciphertext,
        salt: encryptedData.salt,
        iv: encryptedData.iv,
        version: 1,
        type: 'ledger',
        createdAt: Date.now(),
      });

      const message: LedgerImportAccountMessage = {
        type: 'LEDGER_IMPORT_ACCOUNT',
        payload: {
          publicKey: importedKey,
          accountIndex,
          accountName: finalAccountName,
        },
      };

      console.log('[import-ledger] handleSave — sending LEDGER_IMPORT_ACCOUNT to background...');
      const responseRaw = await chrome.runtime.sendMessage(message);
      console.log('[import-ledger] handleSave — LEDGER_IMPORT_ACCOUNT response:', responseRaw);
      const response = responseRaw as
        | LedgerImportAccountResponse
        | { error: string };

      if (
        !response ||
        'error' in response ||
        !('success' in response) ||
        !response.success
      ) {
        throw new Error(
          'error' in response ? response.error : t('ledger.import.error_save'),
        );
      }

      console.log('[import-ledger] handleSave — setting wallet store...');
      setWallet({
        publicKey: importedKey,
        accountId: null,
        accountType: 'ledger',
        accountName: finalAccountName,
        ledgerAccountIndex: accountIndex,
      });

      setTempPassword(tempPassword);
      setHasVault(true);
      setIsAuthenticated(true);

      // Persist the session so restoreSession() in the reopened extension
      // authenticates the user automatically (same as wallet-unlock.tsx).
      const { autoLockTimeout } = useSettingsStore.getState();
      if (autoLockTimeout !== 0) {
        await sessionStorage.set('clorio_session', {
          password: tempPassword,
          timestamp: Date.now(),
        });
      }

      console.log('[import-ledger] handleSave — wallet set, auth enabled, opening extension');

      toast({
        variant: 'success',
        title: t('common.success'),
        description: t('ledger.import.success_desc'),
      });

      // Ask the background to open the extension (popup or sidepanel) and
      // wait for confirmation before closing — ensures the SW stays alive
      // until chrome.sidePanel.open() / openPopup() actually completes.
      await new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({ type: 'OPEN_EXTENSION' }, () => resolve());
      });
      window.close();
    } catch (err) {
      console.error('[import-ledger] handleSave — FAILED:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description:
          err instanceof Error ? err.message : t('ledger.import.error_save'),
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    importedKey,
    accountIndex,
    accountName,
    tempPassword,
    setWallet,
    setHasVault,
    setIsAuthenticated,
    setTempPassword,
    navigate,
    toast,
    t,
  ]);

  return (
    <div className="flex flex-col h-full py-4 space-y-6">
      <header className="flex items-center gap-3 px-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          disabled={isImporting || isSaving}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{t('ledger.import.title')}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-1 space-y-6">
        {step === 'connect' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('ledger.import.connect_desc')}
              </p>
            </div>

            <LedgerConnectStep
              status={status}
              isChecking={isChecking}
              onVerify={status === LedgerStatus.READY ? handleCheckStatus : handleConnect}
            />
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('ledger.import.confirm_desc')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('ledger.import.account_name_label')}
                </label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={DEFAULT_ACCOUNT_NAME}
                  maxLength={24}
                  disabled={isImporting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('ledger.import.account_index_label')}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={accountIndex}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 0) handleAccountIndexChange(val);
                  }}
                  disabled={isImporting}
                />
                <p className="text-xs text-muted-foreground font-mono">
                  {hdPathDisplay}
                </p>
              </div>
            </div>

            {/* Inline error banner — lets the user retry without losing config */}
            {importError && (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {importError.kind === LedgerErrorKind.REJECTED ? (
                    <XCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  ) : importError.kind === LedgerErrorKind.APP_NOT_OPEN ? (
                    <AppWindow className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {importError.kind === LedgerErrorKind.REJECTED
                        ? t(
                            'ledger.errors.rejected_title',
                            'Cancelled on device',
                          )
                        : importError.kind === LedgerErrorKind.APP_NOT_OPEN
                          ? t(
                              'ledger.errors.app_not_open_title',
                              'Mina app not open',
                            )
                          : t(
                              'ledger.errors.disconnected_title',
                              'Ledger not found',
                            )}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {importError.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('ledger.import.waiting_device')}
                </>
              ) : importError ? (
                <>
                  <HardDrive className="mr-2 h-4 w-4" />
                  {t('ledger.errors.retry', 'Try again')}
                </>
              ) : (
                <>
                  <HardDrive className="mr-2 h-4 w-4" />
                  {t('ledger.import.confirm_button')}
                </>
              )}
            </Button>

            {isImporting && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  {t('ledger.import.waiting_desc')}
                </p>
                <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                  <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                    {t(
                      'ledger.import.keep_tab_open',
                      'Keep the USB connection tab open while confirming on your Ledger.',
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'done' && importedKey && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
              <div className="text-center space-y-1">
                <h2 className="font-semibold text-base">
                  {t('ledger.import.done_title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('ledger.import.done_desc')}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {t('ledger.import.account_name_label')}
                </p>
                <p className="text-sm font-medium">
                  {accountName || DEFAULT_ACCOUNT_NAME}
                </p>
              </div>
              <div className="h-px bg-border/40" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {t('ledger.import.hd_path_label')}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {hdPathDisplay}
                </p>
              </div>
              <div className="h-px bg-border/40" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {t('ledger.import.address_label')}
                </p>
                <p className="text-xs font-mono break-all">{importedKey}</p>
              </div>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('ledger.import.saving')}
                </>
              ) : (
                t('ledger.import.save_button')
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
