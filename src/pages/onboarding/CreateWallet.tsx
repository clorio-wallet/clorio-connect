import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const CreateWalletPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container max-w-lg mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Wallet</CardTitle>
          <CardDescription>
            Generate a new secure wallet. You'll receive a seed phrase that you must keep safe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Creating a new wallet involves generating a unique 12-word seed phrase. 
            This phrase gives full access to your funds.
          </p>
          {/* TODO: Add seed phrase generation logic */}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
          <Button onClick={() => navigate('/dashboard')}>Continue</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateWalletPage;
