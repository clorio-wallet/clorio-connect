import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  Database,
  Key,
  HardDrive,
  ArrowLeft,
} from 'lucide-react';
import { VaultManager } from '@/lib/vault-manager';
import { BIP44Service } from '@/lib/bip44';
import { VaultValidator } from '@/lib/vault-validator';
import type { VaultData, WalletType } from '@/lib/types/vault';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const VaultTestingPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [password, setPassword] = useState('test1234');
  const [walletName, setWalletName] = useState('Test Wallet');
  const [mnemonic, setMnemonic] = useState(
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  );
  const [privateKey, setPrivateKey] = useState('');
  const [walletType, setWalletType] = useState<WalletType>('mnemonic');
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // Load vault on mount
  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    setLoading(true);
    try {
      const vaultData = await VaultManager.loadVault();
      setVault(vaultData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vault');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVault = async () => {
    setLoading(true);
    setError(null);
    try {
      const secret = walletType === 'mnemonic' ? mnemonic : privateKey;
      const vault = await VaultManager.createVault(password, {
        name: walletName,
        secret,
        type: walletType,
        derivationPath:
          walletType === 'mnemonic'
            ? BIP44Service.getDerivationPath(0)
            : undefined,
        accountIndex: walletType === 'mnemonic' ? 0 : undefined,
      });
      setVault(vault);
      toast({
        title: 'Vault Created',
        description: `Vault created with wallet "${walletName}"`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create vault';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const secret = walletType === 'mnemonic' ? mnemonic : privateKey;
      const walletId = await VaultManager.addWallet(
        password,
        {
          name: walletName,
          secret,
          type: walletType,
          derivationPath:
            walletType === 'mnemonic'
              ? BIP44Service.getDerivationPath(0)
              : undefined,
          accountIndex: walletType === 'mnemonic' ? 0 : undefined,
        },
        { setAsActive: true },
      );
      await loadVault();
      toast({
        title: 'Wallet Added',
        description: `Wallet "${walletName}" added with ID: ${walletId.slice(0, 8)}...`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add wallet';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeriveAccount = async () => {
    if (!vault || vault.wallets.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      // Find first mnemonic wallet
      const mnemonicWallet = vault.wallets.find((w) => w.type === 'mnemonic');
      if (!mnemonicWallet) {
        throw new Error('No mnemonic wallet found to derive from');
      }

      const derived = await VaultManager.deriveNewAccount(
        password,
        mnemonicWallet.id,
        walletName || undefined,
      );
      await loadVault();
      toast({
        title: 'Account Derived',
        description: `Derived account #${derived.accountIndex} with public key: ${derived.publicKey.slice(0, 12)}...`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to derive account';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (walletId: string) => {
    setLoading(true);
    setError(null);
    try {
      await VaultManager.setActiveWallet(walletId);
      await loadVault();
      toast({
        title: 'Active Wallet Changed',
        description: 'Wallet is now active',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to set active wallet';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWallet = async (walletId: string) => {
    setLoading(true);
    setError(null);
    try {
      await VaultManager.removeWallet(walletId);
      await loadVault();
      toast({
        title: 'Wallet Removed',
        description: 'Wallet has been deleted',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove wallet';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenameWallet = async () => {
    if (!selectedWalletId || !newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await VaultManager.updateWalletName(selectedWalletId, newName);
      await loadVault();
      setNewName('');
      setSelectedWalletId(null);
      toast({
        title: 'Wallet Renamed',
        description: `Wallet renamed to "${newName}"`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to rename wallet';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVault = async () => {
    setLoading(true);
    setError(null);
    try {
      await VaultManager.deleteVault();
      setVault(null);
      toast({
        title: 'Vault Deleted',
        description: 'All wallet data has been cleared',
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete vault';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetPrivateKey = async (walletId: string) => {
    setLoading(true);
    setError(null);
    try {
      const secret = await VaultManager.getPrivateKey(password, walletId);
      const wallet = vault?.wallets.find((w) => w.id === walletId);
      toast({
        title: 'Private Key Retrieved',
        description: `${wallet?.type === 'mnemonic' ? 'Mnemonic' : 'Private Key'}: ${secret.slice(0, 20)}...`,
        duration: 5000,
      });
      console.log('Full secret:', secret);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to get private key';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const validateVault = () => {
    if (!vault) return null;
    return VaultValidator.validateVault(vault);
  };

  const validation = validateVault();

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Multi-Wallet Vault Testing</h1>
            <p className="text-sm text-muted-foreground">
              Test and debug the vault system
            </p>
          </div>
        </div>
        <Button onClick={loadVault} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* Vault Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Vault Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {vault ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="font-mono font-bold">{vault.version}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Wallets</p>
                  <p className="font-mono font-bold">{vault.wallets.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="font-mono text-xs truncate">
                    {vault.activeWalletId.slice(0, 8)}...
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-xs">
                    {new Date(vault.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Validation */}
              {validation && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    {validation.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="font-medium">
                      {validation.valid ? 'Valid Vault' : 'Validation Failed'}
                    </span>
                  </div>
                  {!validation.valid && (
                    <ul className="text-sm text-destructive space-y-1 ml-6 list-disc">
                      {validation.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No vault found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create/Add</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
        </TabsList>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {vault ? 'Add Wallet to Vault' : 'Create New Vault'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>

              <div className="space-y-2">
                <Label>Wallet Name</Label>
                <Input
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="My Wallet"
                />
              </div>

              <div className="space-y-2">
                <Label>Wallet Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={walletType === 'mnemonic' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWalletType('mnemonic')}
                  >
                    Mnemonic
                  </Button>
                  <Button
                    variant={
                      walletType === 'privateKey' ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setWalletType('privateKey')}
                  >
                    Private Key
                  </Button>
                </div>
              </div>

              {walletType === 'mnemonic' ? (
                <div className="space-y-2">
                  <Label>Mnemonic</Label>
                  <textarea
                    className="w-full min-h-[80px] p-2 rounded-md border bg-background text-sm"
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    placeholder="Enter 12 or 24 word mnemonic"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Private Key</Label>
                  <Input
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="EK..."
                  />
                </div>
              )}

              <div className="flex gap-2">
                {!vault ? (
                  <Button
                    onClick={handleCreateVault}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Vault
                  </Button>
                ) : (
                  <Button
                    onClick={handleAddWallet}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Wallet
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {vault && vault.wallets.some((w) => w.type === 'mnemonic') && (
            <Card>
              <CardHeader>
                <CardTitle>Derive New Account (BIP44)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Derive a new account from an existing mnemonic wallet using
                  BIP44 standard.
                </p>
                <div className="space-y-2">
                  <Label>Account Name (optional)</Label>
                  <Input
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder="Trading Account"
                  />
                </div>
                <Button onClick={handleDeriveAccount} disabled={loading}>
                  <Key className="w-4 h-4 mr-2" />
                  Derive Account
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rename Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Wallet</Label>
                <select
                  className="w-full p-2 rounded-md border bg-background"
                  value={selectedWalletId || ''}
                  onChange={(e) => setSelectedWalletId(e.target.value || null)}
                >
                  <option value="">-- Select wallet --</option>
                  {vault?.wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.publicKey.slice(0, 12)}...)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>New Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New wallet name"
                />
              </div>
              <Button
                onClick={handleRenameWallet}
                disabled={loading || !selectedWalletId || !newName.trim()}
              >
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleDeleteVault}
                disabled={loading || !vault}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Entire Vault
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-4">
          {vault?.wallets.map((wallet) => (
            <Card
              key={wallet.id}
              className={
                wallet.id === vault.activeWalletId ? 'border-primary' : ''
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{wallet.name}</CardTitle>
                      {wallet.id === vault.activeWalletId && (
                        <Badge variant="default">Active</Badge>
                      )}
                      <Badge variant="outline">{wallet.type}</Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">
                      ID: {wallet.id}
                    </p>
                  </div>
                  {wallet.type === 'ledger' && (
                    <HardDrive className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Public Key</p>
                    <p className="font-mono text-sm break-all">
                      {wallet.publicKey}
                    </p>
                  </div>
                  {wallet.derivationPath && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Derivation Path
                      </p>
                      <p className="font-mono text-sm">
                        {wallet.derivationPath}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Account Index: {wallet.accountIndex}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {new Date(wallet.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {wallet.lastUsed && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Last Used
                        </p>
                        <p className="text-sm">
                          {new Date(wallet.lastUsed).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  {wallet.id !== vault.activeWalletId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetActive(wallet.id)}
                      disabled={loading}
                    >
                      Set Active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGetPrivateKey(wallet.id)}
                    disabled={loading}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Get Secret
                  </Button>
                  {vault.wallets.length > 1 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveWallet(wallet.id)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {!vault?.wallets.length && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No wallets in vault</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VaultTestingPage;
