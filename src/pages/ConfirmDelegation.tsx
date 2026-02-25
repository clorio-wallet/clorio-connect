import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoldToConfirmButton } from '@/components/wallet/hold-to-confirm-button';
import { ValidatorDetails } from '@/components/wallet/validator-details-sheet';
import { useGetAccount } from '@/api/mina/mina';
import { useWalletStore } from '@/stores/wallet-store';
import { formatBalance, formatAddress, truncateMiddle } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const ConfirmDelegationPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { publicKey } = useWalletStore();
  const [isOpen, setIsOpen] = useState(false);

  // Safely cast the validator from location state
  const validator = location.state?.validator as ValidatorDetails | undefined;

  const { data: accountData } = useGetAccount(publicKey || '', {
    query: {
      enabled: !!publicKey,
    },
  });

  if (!validator) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-4">
        <p className="text-muted-foreground">No validator selected.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const handleConfirm = async () => {
    // Placeholder for delegation logic
    try {
      console.log('Delegating to:', validator.publicKey);
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: t('common.success', 'Success'),
        description: t('validators.delegation_success', 'Successfully delegated to {{name}}', {
          name: validator.name || formatAddress(validator.publicKey)
        }),
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Delegation failed:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('validators.delegation_failed', 'Failed to delegate'),
        variant: 'destructive',
      });
    }
  };

  const nonce = accountData?.nonce || 0;
  const networkFee = 0.012; // Example fee

  return (
    <div className="flex flex-col h-full bg-background text-foreground relative">
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6">
        <h1 className="text-center text-xl font-medium mb-8">
          {t('staking.confirm_delegation', 'Confirm delegation')}
        </h1>

        <div className="flex flex-col items-center space-y-6">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-full bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
            {validator.imgurl ? (
              <img
                src={validator.imgurl}
                alt={validator.name || validator.publicKey}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-zinc-800" />
            )}
          </div>

          {/* Validator Info */}
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold">
              {validator.name || formatAddress(validator.publicKey)}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              {truncateMiddle(validator.publicKey, 24)}
            </p>
          </div>

          {/* Details Card */}
          <div className="w-full max-w-sm rounded-xl border border-border/40 bg-card/30 overflow-hidden">
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">
                  {t('validators.total_stake_label', 'Total stake')}
                </span>
                <span className="font-mono text-sm">
                  {formatBalance(validator.stake)} MINA
                </span>
              </div>

              <div className="h-px bg-border/40" />

              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">
                  {t('validators.fee_label', 'Validator fee')}
                </span>
                <span className="font-mono text-sm">
                  {validator.fee}%
                </span>
              </div>
              
              <div className="h-px bg-border/40" />

              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">
                  {t('send.network_fee_label', 'Network fee')}
                </span>
                <span className="font-mono text-sm">
                  {networkFee} MINA
                </span>
              </div>

              <div className="h-px bg-border/40" />

              {/* Advanced Section */}
              <div className="w-full space-y-2">
                <div 
                  className="flex items-center justify-between cursor-pointer w-full hover:opacity-80 transition-opacity"
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <span className="font-bold text-sm">
                    {t('common.advanced', 'Advanced')}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                
                {isOpen && (
                  <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-200 fade-in">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">
                        {t('transaction_details.nonce', 'Nonce')}
                      </span>
                      <span className="font-mono text-sm">
                        {nonce}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border/20">
        <HoldToConfirmButton
          onConfirm={handleConfirm}
          className="w-full h-12 text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
        >
          {t('transaction_confirm.hold_to_confirm', 'Hold to Confirm')}
        </HoldToConfirmButton>
      </div>
    </div>
  );
};

export default ConfirmDelegationPage;
