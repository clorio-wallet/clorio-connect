import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BalanceDisplay } from '@/components/wallet/balance-display';
import { AddressDisplay } from '@/components/wallet/address-display';
import { Button } from '@/components/ui/button';
import { LogOut, Lock, BookPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, resetWallet } = useSessionStore();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged Out',
      description: 'Your session has been cleared.',
    });
    navigate('/login');
  };

  const handleDeleteWallet = async () => {
    await resetWallet();
    toast({
      title: 'Wallet Deleted',
      description: 'Your wallet has been removed from this device.',
    });
    navigate('/welcome');
  };

  return (
    <div className="space-y-6 py-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/playground')}
          >
            <BookPlus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Logout"
          >
            <Lock className="h-5 w-5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Delete Wallet"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your wallet from this device. Make sure you have backed up
                  your Secret Recovery Phrase or Private Key.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteWallet}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Wallet
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceDisplay
            balance={12.45}
            symbol="MINA"
            showFiat
            fiatValue={24500.12}
            size="lg"
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Your Address
        </h3>
        <Card>
          <CardContent className="py-3">
            <AddressDisplay
              address="0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
              showCopy
              showExplorer
              explorerUrl="https://minascan.io"
            />
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for transaction history or other dashboard widgets */}
      <div className="text-center text-muted-foreground text-sm py-8">
        No recent transactions
      </div>
    </div>
  );
};

export default DashboardPage;
