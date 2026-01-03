import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Clorio</h1>
        <p className="text-muted-foreground text-lg">Your secure crypto companion</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Get started with your wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => navigate('/onboarding/create')}
          >
            Create New Wallet
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            size="lg"
            onClick={() => navigate('/onboarding/import')}
          >
            Import Wallet
          </Button>
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        Already have a wallet? <Button variant="link" className="p-0" onClick={() => navigate('/login')}>Login</Button>
      </div>
    </div>
  );
};

export default WelcomePage;
