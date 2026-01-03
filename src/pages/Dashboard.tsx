import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BalanceDisplay } from '@/components/wallet/balance-display';
import { AddressDisplay } from '@/components/wallet/address-display';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 py-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate('/playground')}>
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceDisplay 
            balance={12.45} 
            symbol="ETH" 
            showFiat 
            fiatValue={24500.12} 
            size="lg"
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Your Address</h3>
        <Card>
          <CardContent className="py-3">
            <AddressDisplay 
              address="0x71C7656EC7ab88b098defB751B7401B5f6d8976F" 
              showCopy 
              showExplorer
              explorerUrl="https://etherscan.io"
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
