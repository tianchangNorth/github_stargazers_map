import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Github, Key, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getLoginUrl } from '@/const';

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [token, setToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: tokenData, refetch: refetchToken } = trpc.settings.getGithubToken.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: rateLimit, refetch: refetchRateLimit } = trpc.stargazers.checkRateLimit.useQuery();

  const saveTokenMutation = trpc.settings.saveGithubToken.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setToken('');
      toast.success('GitHub token saved successfully!');
      refetchToken();
      refetchRateLimit();
    },
    onError: (error) => {
      setIsSaving(false);
      toast.error(error.message || 'Failed to save token');
    },
  });

  const deleteTokenMutation = trpc.settings.deleteGithubToken.useMutation({
    onSuccess: () => {
      toast.success('GitHub token deleted successfully!');
      refetchToken();
      refetchRateLimit();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete token');
    },
  });

  const handleSaveToken = () => {
    if (!token.trim()) {
      toast.error('Please enter a valid token');
      return;
    }

    setIsSaving(true);
    saveTokenMutation.mutate({ token: token.trim() });
  };

  const handleDeleteToken = () => {
    if (confirm('Are you sure you want to delete your GitHub token?')) {
      deleteTokenMutation.mutate();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>
                <Github className="w-4 h-4 mr-2" />
                Log in with Manus
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your GitHub integration and API settings
          </p>
        </div>

        {/* Rate Limit Status */}
        {rateLimit && rateLimit.success && (
          <Card className="border-cyan-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-cyan-400" />
                GitHub API Rate Limit
              </CardTitle>
              <CardDescription>
                Current API usage status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Limit</p>
                  <p className="text-2xl font-bold text-cyan-400">{rateLimit.limit}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className={`text-2xl font-bold ${(rateLimit.remaining ?? 0) > 10 ? 'text-green-400' : 'text-pink-500'}`}>
                    {rateLimit.remaining ?? 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Reset Time</p>
                  <p className="text-sm font-medium text-foreground">
                    {rateLimit.reset ? new Date(rateLimit.reset).toLocaleTimeString() : 'N/A'}
                  </p>
                </div>
              </div>

              {(rateLimit.remaining ?? 0) === 0 && (
                <Alert className="border-pink-500/50 bg-pink-500/10">
                  <AlertCircle className="h-4 w-4 text-pink-500" />
                  <AlertDescription className="text-pink-200">
                    You've reached the API rate limit. Add a GitHub token to increase your limit to 5,000 requests/hour.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* GitHub Token Settings */}
        <Card className="border-cyan-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              GitHub Personal Access Token
            </CardTitle>
            <CardDescription>
              Add your GitHub token to increase API rate limit from 60 to 5,000 requests/hour
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenData?.hasToken ? (
              <div className="space-y-4">
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-200">
                    Token configured: {tokenData.token}
                  </AlertDescription>
                </Alert>

                <Button
                  variant="destructive"
                  onClick={handleDeleteToken}
                  disabled={deleteTokenMutation.isPending}
                >
                  {deleteTokenMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Delete Token
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github-token">GitHub Token</Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    Create a token at{' '}
                    <a
                      href="https://github.com/settings/tokens/new?scopes=public_repo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      GitHub Settings
                    </a>
                    {' '}with <code className="text-pink-400">public_repo</code> scope
                  </p>
                </div>

                <Button
                  onClick={handleSaveToken}
                  disabled={isSaving || !token.trim()}
                  className="w-full sm:w-auto"
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Token
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-cyan-500/20">
          <CardHeader>
            <CardTitle>How to create a GitHub token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Go to{' '}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  GitHub Settings → Developer settings → Personal access tokens
                </a>
              </li>
              <li>Click "Generate new token (classic)"</li>
              <li>Give it a descriptive name (e.g., "Stargazers Map")</li>
              <li>Select the <code className="text-pink-400">public_repo</code> scope</li>
              <li>Click "Generate token" at the bottom</li>
              <li>Copy the token and paste it above</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
