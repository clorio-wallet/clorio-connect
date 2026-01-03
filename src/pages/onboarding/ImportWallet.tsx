import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const ImportWalletPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container max-w-lg mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Import Wallet</CardTitle>
          <CardDescription>
            Restore your wallet using your 12 or 24-word seed phrase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your seed phrase below to restore your wallet.
          </p>
          {/* TODO: Add seed phrase input logic */}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
          <Button onClick={() => navigate('/dashboard')}>Import</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ImportWalletPage;
