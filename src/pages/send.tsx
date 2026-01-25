import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SendForm } from '@/components/wallet';
import { useWalletStore } from '@/stores/wallet-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useGetAccount } from '@/api/mina/mina';
import { useMinimumLoading } from '@/hooks/use-minimum-loading';
import { useToast } from '@/hooks/use-toast';
import type { SendTransactionFormData } from '@/lib/validations';

const SendPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { publicKey } = useWalletStore();
  const { balancePollInterval } = useSettingsStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!publicKey) {
      navigate('/welcome');
    }
  }, [publicKey, navigate]);

  const pollIntervalMs =
    balancePollInterval > 0 ? balancePollInterval * 60 * 1000 : 0;

  const { data: accountData, isLoading: isAccountLoading } = useGetAccount(
    publicKey || '',
    {
      query: {
        enabled: !!publicKey,
        refetchInterval: pollIntervalMs > 0 ? pollIntervalMs : false,
      }
    }
  );

  const displayLoading = useMinimumLoading(isAccountLoading, 500);

  const balanceRaw = accountData?.balance || 0;
  const balanceMina = Number(balanceRaw) / 1e9;

  const handleSubmit = async (formData: SendTransactionFormData) => {
    toast({
      title: t('dashboard.not_implemented'),
      description: t('dashboard.send_tx_coming_soon'),
    });
    console.log('Send transaction form submitted', formData);
  };

  return (
    <div className="space-y-6 py-2">
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {t('send.send_button')}
        </h1>
      </header>

      <div className="pb-4">
        <SendForm
          balance={displayLoading ? '0' : balanceMina.toString()}
          symbol="MINA"
          price={1}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  );
};

export default SendPage;

