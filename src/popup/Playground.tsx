import React, { useState, useEffect } from 'react';
import { ModeSelector } from '@/components/ui/mode-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetClose,
} from '@/components/ui/bottom-sheet';
import { useTheme, Palette } from '@/components/theme-provider';
import { Moon, Sun, Monitor } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { AddressDisplay } from '@/components/wallet/address-display';
import { BalanceDisplay } from '@/components/wallet/balance-display';
import { HoldToConfirmButton } from '@/components/wallet/hold-to-confirm-button';
import { PasswordInput } from '@/components/wallet/password-input';
import { NetworkBadge } from '@/components/wallet/network-badge';
import { TransactionConfirmDialog } from '@/components/wallet/transaction-confirm-dialog';
import { SeedPhraseDisplay } from '@/components/wallet/seed-phrase-display';
import { AccountCard } from '@/components/wallet/account-card';
import { AssetCard } from '@/components/wallet/asset-card';
import { ValidatorCard } from '@/components/wallet/validator-card';
import { ValidatorList } from '@/components/wallet/validator-list';
import { TransactionList } from '@/components/wallet/transaction-list';
import { SendForm } from '@/components/wallet/send-form';
import { StakeForm } from '@/components/wallet/stake-form';
import { AnimatedNumber } from '@/components/ui/animated-number';

const mockValidators = [
  {
    address: 'B62qpt...',
    name: 'MinaExplorer',
    stake: 50000000,
    fee: 5,
    delegators: 1200,
    isDelegated: true,
  },
  {
    address: 'B62qr...',
    name: 'Auro Wallet',
    stake: 30000000,
    fee: 5,
    delegators: 800,
  },
  {
    address: 'B62qs...',
    name: 'Clorio',
    stake: 25000000,
    fee: 2,
    delegators: 500,
  },
  {
    address: 'B62qt...',
    stake: 15000000,
    fee: 1,
    delegators: 100,
  },
];

const PlaygroundPage: React.FC = () => {
  const [uiMode, setUiMode] = useState<'popup' | 'sidepanel'>('sidepanel');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { theme, setTheme, palette, setPalette } = useTheme();

  // Debug state for BalanceDisplay
  const [debugBalance, setDebugBalance] = useState(123.4567);
  const [debugLoading, setDebugLoading] = useState(false);
  const [balanceDisplayKey, setBalanceDisplayKey] = useState(0);

  useEffect(() => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get({ uiMode: 'sidepanel' }, (res) => {
        setUiMode(res.uiMode as 'popup' | 'sidepanel');
      });
    }
  }, []);

  function updateMode(next: 'popup' | 'sidepanel') {
    setUiMode(next);
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SET_UIMODE', value: next });
    }
  }

  return (
    <div
      style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}
      className="space-y-8 pb-20"
    >
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Design System Playground
        </h1>
        <p className="text-muted-foreground">
          Welcome to the Clorio Wallet component playground. Here you can test
          all available UI components and themes.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Theme & Mode Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Theme & Mode</h2>
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Manage application appearance and behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>UI Mode</Label>
                <ModeSelector mode={uiMode} onChange={updateMode} />
              </div>

              <div className="space-y-2">
                <Label>Color Theme</Label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setTheme('system')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color Palette</Label>
                <div className="flex flex-wrap gap-2">
                  {(['default', 'green', 'violet', 'orange'] as Palette[]).map(
                    (p) => (
                      <Button
                        key={p}
                        variant={palette === p ? 'default' : 'outline'}
                        onClick={() => setPalette(p)}
                        className="capitalize"
                      >
                        {p}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Buttons</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="lg">Large</Button>
                <Button size="default">Default</Button>
                <Button size="sm">Small</Button>
                <Button size="icon">
                  <Sun className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Inputs Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Inputs</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input type="email" id="email" placeholder="Email" />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input type="password" id="password" placeholder="Password" />
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="error-input" className="text-destructive">
                  Error State
                </Label>
                <Input
                  type="text"
                  id="error-input"
                  placeholder="Invalid input"
                  error
                />
                <p className="text-sm text-destructive">
                  This field has an error.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tabs Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Tabs</h2>
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="account" className="w-[400px]">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>
                <TabsContent value="account">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account</CardTitle>
                      <CardDescription>
                        Make changes to your account here. Click save when
                        you're done.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" defaultValue="Pedro Duarte" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" defaultValue="@peduarte" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button>Save changes</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                <TabsContent value="password">
                  <Card>
                    <CardHeader>
                      <CardTitle>Password</CardTitle>
                      <CardDescription>
                        Change your password here. After saving, you'll be
                        logged out.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="current">Current password</Label>
                        <Input id="current" type="password" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new">New password</Label>
                        <Input id="new" type="password" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button>Save password</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Overlays Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Overlays</h2>
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                    <DialogDescription>
                      Make changes to your profile here. Click save when you're
                      done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        defaultValue="Pedro Duarte"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Username
                      </Label>
                      <Input
                        id="username"
                        defaultValue="@peduarte"
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <BottomSheet>
                <BottomSheetTrigger asChild>
                  <Button variant="outline">Open Bottom Sheet</Button>
                </BottomSheetTrigger>
                <BottomSheetContent>
                  <BottomSheetHeader>
                    <BottomSheetTitle>
                      Are you absolutely sure?
                    </BottomSheetTitle>
                    <BottomSheetDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove your data from our servers.
                    </BottomSheetDescription>
                  </BottomSheetHeader>
                  <BottomSheetFooter>
                    <Button>Submit</Button>
                    <BottomSheetClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </BottomSheetClose>
                  </BottomSheetFooter>
                </BottomSheetContent>
              </BottomSheet>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Show Alert Dialog</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </section>

        {/* Form Elements Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Form Elements & Selection</h2>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center space-x-4">
                <Label>Switch</Label>
                <Switch />
              </div>

              <Separator />

              <div className="flex flex-col space-y-2 max-w-xs">
                <Label>Select</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a fruit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="apple">Apple</SelectItem>
                      <SelectItem value="banana">Banana</SelectItem>
                      <SelectItem value="blueberry">Blueberry</SelectItem>
                      <SelectItem value="grapes">Grapes</SelectItem>
                      <SelectItem value="pineapple">Pineapple</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Feedback & Loading Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Feedback & Loading</h2>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-wrap gap-4 items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover me</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add to library</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label>Spinners:</Label>
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                </div>

                <div className="space-y-2">
                  <Label>Skeleton:</Label>
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        {/* Wallet Components Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Wallet Components</h2>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label>Address Display</Label>
                <div className="flex flex-col gap-2">
                  <AddressDisplay address="0x71C7656EC7ab88b098defB751B7401B5f6d8976F" />
                  <AddressDisplay
                    address="0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
                    truncate={false}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Balance Display</Label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <BalanceDisplay
                      key={balanceDisplayKey}
                      balance={debugBalance}
                      symbol="MINA"
                      showFiat
                      fiatValue={debugBalance * 2000}
                      loading={debugLoading}
                    />
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => setDebugBalance(prev => prev + (Math.random() * 100))}
                      >
                        Update Balance
                      </Button>
                      <Button 
                        size="sm" 
                        variant={debugLoading ? "default" : "outline"}
                        onClick={() => setDebugLoading(prev => !prev)}
                      >
                        Loading: {debugLoading ? 'ON' : 'OFF'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setBalanceDisplayKey(prev => prev + 1);
                          setDebugLoading(true);
                        }}
                      >
                        Reset (First Load)
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-end gap-4">
                    <BalanceDisplay balance={123.4567} symbol="MINA" size="lg" />
                    <BalanceDisplay balance={0} symbol="MINA" loading />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Network Badges</Label>
                <div className="flex gap-2">
                  <NetworkBadge network="mainnet" />
                  <NetworkBadge network="testnet" />
                  <NetworkBadge network="devnet" />
                  <NetworkBadge network="local" />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Hold To Confirm</Label>
                <div className="flex gap-2">
                  <HoldToConfirmButton onConfirm={() => alert('Confirmed!')}>
                    Hold to Confirm
                  </HoldToConfirmButton>
                  <HoldToConfirmButton
                    onConfirm={() => alert('Deleted!')}
                    variant="destructive"
                  >
                    Hold to Delete
                  </HoldToConfirmButton>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Transaction Dialog</Label>
                <div>
                  <Button onClick={() => setShowConfirmDialog(true)}>
                    Open Transaction Dialog
                  </Button>
                  <TransactionConfirmDialog
                    open={showConfirmDialog}
                    onOpenChange={setShowConfirmDialog}
                    onConfirm={() => {
                      alert('Transaction Sent!');
                      setShowConfirmDialog(false);
                    }}
                    transaction={{
                      to: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                      amount: '1.5',
                      symbol: 'MINA',
                      fee: '0.002',
                      network: 'mainnet',
                    }}
                    origin="https://app.uniswap.org"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Password Input</Label>
                <div className="max-w-sm">
                  <PasswordInput
                    showStrength
                    label="New Password"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Seed Phrase Display</Label>
                <SeedPhraseDisplay
                  mnemonic={[
                    'witch',
                    'collapse',
                    'practice',
                    'feed',
                    'shame',
                    'open',
                    'despair',
                    'creek',
                    'road',
                    'again',
                    'ice',
                    'least',
                  ]}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  Advanced Components (Part 2)
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Animated Number</Label>
                    <div className="text-2xl font-bold">
                      <AnimatedNumber value={1234.56} prefix="$" decimals={2} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Card</Label>
                    <AccountCard
                      account={{
                        name: 'Main Account',
                        address: 'B62qjsV6W2...7j3d',
                        balance: '1,234.56',
                        symbol: 'MINA',
                      }}
                      isActive={true}
                      onRename={() => {}}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Asset Card 123</Label>
                    <AssetCard
                      name="Mina Protocol"
                      symbol="MINA"
                      balance={1500.5}
                      price={1.25}
                      change24h={5.4}
                      onClick={() => console.log('Asset clicked')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Validator Card</Label>
                    <ValidatorCard
                      name="MinaExplorer"
                      address="B62qpt..."
                      stake={50000000}
                      fee={5}
                      delegators={1200}
                      isDelegated={true}
                      onDelegate={() => console.log('Delegate clicked')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Send Form</Label>
                  <Card className="p-4">
                    <SendForm
                      balance="1000"
                      symbol="MINA"
                      price={1.23}
                      onSubmit={async (data) => console.log(data)}
                    />
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Stake Form</Label>
                  <Card className="p-4">
                    <StakeForm
                      balance="1000"
                      symbol="MINA"
                      validators={[
                        { id: '1', name: 'Validator 1', apy: 12 },
                        { id: '2', name: 'Validator 2', apy: 10 },
                      ]}
                      onSubmit={async (data) => console.log(data)}
                    />
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Validator List</Label>
                  <div className="h-[400px] border rounded-md">
                    <ValidatorList validators={mockValidators} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Transaction List</Label>
                  <div className="h-[400px] border rounded-md">
                    <TransactionList
                      transactions={Array.from({ length: 20 }).map((_, i) => ({
                        id: String(i),
                        type: i % 2 === 0 ? "payment" : "delegation",
                        status: "applied",
                        amount: 100,
                        symbol: "MINA",
                        sender: "B62...",
                        receiver: "B62...",
                        isIncoming: i % 2 !== 0,
                        fee: 0.1,
                        timestamp: "2024-01-01",
                        hash: "0x...",
                      }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default PlaygroundPage;
