import { useTranslation } from 'react-i18next';
import { CustomQRCode } from '@/components/ui/custom-qr-code';
import clorioConnectLogo from '@/assets/clorio-connect-logo.svg';
import type { PaperWalletPayload } from '@/messages/types';

export function PaperWallet({
  name,
  publicKey,
  mnemonic,
  privateKey,
}: PaperWalletPayload) {
  const { t } = useTranslation();
  const words = mnemonic ? mnemonic.split(/\s+/) : [];

  return (
    <section className="paper-wallet-print" aria-hidden="true">
      <header className="paper-wallet-header">
        <div>
          <div className="paper-wallet-brand">
            <span className="paper-wallet-logo">
              <img src={clorioConnectLogo} alt="Clorio" />
            </span>
          </div>
          <h1>{t('security.backup.paper_title')}</h1>
        </div>
        <p className="paper-wallet-name">{name}</p>
      </header>

      <div className="paper-wallet-section">
        <div className="paper-wallet-copy">
          <p className="paper-wallet-label">
            {t('security.backup.public_address')}
          </p>
          <p>{t('security.backup.public_address_hint')}</p>
          <code>{publicKey}</code>
        </div>
        <CustomQRCode
          value={publicKey}
          size={180}
          color="#18231d"
          backgroundColor="#ffffff"
        />
      </div>

      <div className="paper-wallet-cut" aria-hidden="true">
        {t('security.backup.fold_line')}
      </div>

      <div className="paper-wallet-section paper-wallet-secrets">
        {mnemonic && (
          <div className="paper-wallet-secret-block">
            <div className="paper-wallet-copy">
              <p className="paper-wallet-label">
                {t('security.backup.title_mnemonic')}
              </p>
              <p>{t('security.backup.secret_hint')}</p>
              <ol className="paper-wallet-words">
                {words.map((word, index) => (
                  <li key={`${word}-${index}`}>{word}</li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {privateKey && (
          <div className="paper-wallet-secret-block">
            <div className="paper-wallet-copy">
              <p className="paper-wallet-label">
                {t('security.backup.title_private_key')}
              </p>
              <p>{t('security.backup.secret_hint')}</p>
              <code>{privateKey}</code>
            </div>
          </div>
        )}
      </div>

      <footer className="paper-wallet-warning">
        <strong>{t('common.warning')}:</strong>{' '}
        {t('security.backup.paper_warning')}
      </footer>
    </section>
  );
}
