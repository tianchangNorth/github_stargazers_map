import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Github, Loader2, MapPin, Users, AlertCircle, X } from 'lucide-react';
import { Link } from 'wouter';
import WorldMap, { CountryData } from '@/components/WorldMap';
import { toast } from 'sonner';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [taskId, setTaskId] = useState<number | null>(null);
  const [taskStatus, setTaskStatus] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    fullName: string;
    starCount: number;
    analyzedCount: number;
    unknownCount: number;
    countryDistribution: Array<{
      countryCode: string;
      countryName: string;
      count: number;
    }>;
  } | null>(null);

  const analyzeMutation = trpc.stargazers.analyze.useMutation({
    onSuccess: (data) => {
      setTaskId(data.taskId);
      toast.success('Analysis started! Tracking progress...');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start analysis');
    },
  });

  const cancelMutation = trpc.stargazers.cancelTask.useMutation({
    onSuccess: () => {
      setTaskId(null);
      setTaskStatus(null);
      toast.success('Analysis cancelled');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel analysis');
    },
  });

  const getAnalysisQuery = trpc.stargazers.getAnalysis.useQuery(
    { fullName: taskStatus?.fullName || '' },
    {
      enabled: taskStatus?.status === 'completed' && !!taskStatus?.fullName,
    }
  );

  // Handle analysis result
  useEffect(() => {
    if (getAnalysisQuery.data) {
      setAnalysisResult(getAnalysisQuery.data);
      setTaskId(null);
      setTaskStatus(null);
      toast.success('Analysis complete!');
    }
  }, [getAnalysisQuery.data]);

  // Poll task status
  useEffect(() => {
    if (!taskId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/trpc/stargazers.getTaskStatus?input=${encodeURIComponent(JSON.stringify({ taskId }))}`);
        const result = await response.json();
        const status = result.result?.data;

        if (status) {
          setTaskStatus(status);

          if (status.status === 'completed') {
            clearInterval(interval);
            // Trigger getAnalysis query
            getAnalysisQuery.refetch();
          } else if (status.status === 'failed') {
            clearInterval(interval);
            setTaskId(null);
            setTaskStatus(null);
            toast.error(status.errorMessage || 'Analysis failed');
          } else if (status.status === 'cancelled') {
            clearInterval(interval);
            setTaskId(null);
            setTaskStatus(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch task status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [taskId]);

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      toast.error('Please enter a repository URL');
      return;
    }

    setAnalysisResult(null);
    setTaskStatus(null);
    analyzeMutation.mutate({ repoUrl: repoUrl.trim(), maxStargazers: 10000 });
  };

  const handleCancel = () => {
    if (taskId) {
      cancelMutation.mutate({ taskId });
    }
  };

  const isAnalyzing = taskStatus?.status === 'running' || taskStatus?.status === 'pending';
  const progress = taskStatus?.progress || 0;
  const currentStep = taskStatus?.currentStep || 'Initializing...';

  const mapData: CountryData[] = analysisResult
    ? analysisResult.countryDistribution.map(country => ({
        name: country.countryName,
        value: country.count,
        countryCode: country.countryCode,
      }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Github className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold neon-glow-pink">
                  GitHub Stargazers Map
                </h1>
              </div>
              <p className="mt-2 text-muted-foreground">
                Visualize the geographic distribution of your repository's stargazers
              </p>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Input Section */}
          <Card className="border-secondary/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl neon-glow-cyan">Analyze Repository</CardTitle>
              <CardDescription>
                Enter a GitHub repository URL to analyze its stargazers' geographic distribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="https://github.com/vercel/next.js"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && handleAnalyze()}
                  disabled={isAnalyzing}
                  className="flex-1"
                />
                {!isAnalyzing ? (
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {analyzeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Analyze
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleCancel}
                    variant="destructive"
                    disabled={cancelMutation.isPending}
                    className="min-w-[120px]"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              {isAnalyzing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{currentStep}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Alert className="border-secondary/50 bg-secondary/10">
                <AlertCircle className="h-4 w-4 text-secondary" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Analysis is limited to 10,000 stargazers. Large repositories may take 1-2 hours to analyze. Results are cached for 24 hours.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Results Section */}
          {analysisResult && (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-primary/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs">Total Stars</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold neon-glow-pink">
                      {analysisResult.starCount.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-secondary/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs">Analyzed Samples</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold neon-glow-cyan">
                      {analysisResult.analyzedCount.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((analysisResult.analyzedCount / analysisResult.starCount) * 100).toFixed(1)}% of total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-destructive/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs">Unknown Locations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-destructive">
                      {analysisResult.unknownCount.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((analysisResult.unknownCount / analysisResult.analyzedCount) * 100).toFixed(1)}% of analyzed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Map Visualization */}
              <Card className="border-secondary/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl neon-glow-cyan">Geographic Distribution</CardTitle>
                  <CardDescription>
                    {analysisResult.fullName} - Stargazers by Country
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WorldMap data={mapData} />
                </CardContent>
              </Card>

              {/* Country Breakdown */}
              {analysisResult.countryDistribution.length > 0 && (
                <Card className="border-secondary/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">Country Breakdown</CardTitle>
                    <CardDescription>Top countries by stargazer count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.countryDistribution.slice(0, 10).map((country, index) => (
                        <div key={country.countryCode} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground w-6">
                              #{index + 1}
                            </span>
                            <span className="font-medium">
                              {country.countryName} ({country.countryCode})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-secondary/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-secondary"
                                style={{
                                  width: `${(country.count / analysisResult.countryDistribution[0].count) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="font-bold text-primary w-12 text-right">
                              {country.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          Powered by GitHub API, Google Maps Geocoding, and ECharts
        </div>
      </footer>
    </div>
  );
}
