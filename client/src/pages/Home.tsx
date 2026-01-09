import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, Loader2, MapPin, Users, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import WorldMap, { CountryData } from '@/components/WorldMap';
import { toast } from 'sonner';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
      setAnalysisResult(data);
      setIsAnalyzing(false);
      toast.success('Analysis complete!');
    },
    onError: (error) => {
      setIsAnalyzing(false);
      toast.error(error.message || 'Failed to analyze repository');
    },
  });

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      toast.error('Please enter a repository URL');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    analyzeMutation.mutate({ repoUrl: repoUrl.trim(), maxStargazers: 10000 });
  };

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
        {/* Input Section */}
        <div className="accent-line-cyan accent-line-magenta">
          <Card className="max-w-3xl mx-auto neon-border-pink">
            <CardHeader>
              <CardTitle className="text-2xl neon-glow-blue">Analyze Repository</CardTitle>
              <CardDescription>
                Enter a GitHub repository URL to analyze its stargazers' geographic distribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://github.com/vercel/next.js"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  disabled={isAnalyzing}
                  className="flex-1 bg-input border-border/50 focus:neon-border-cyan"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="neon-glow-pink"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>

              <Alert className="border-secondary/50 bg-secondary/10">
                <AlertCircle className="h-4 w-4 text-secondary" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Analysis is limited to 10,000 stargazers. Large repositories may take 1-2 hours to analyze. Results are cached for 24 hours.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {analysisResult && (
          <div className="mt-12 space-y-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="neon-border-cyan">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Stars
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold neon-glow-pink">
                    {analysisResult.starCount.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="neon-border-blue">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Analyzed Samples
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold neon-glow-blue">
                    {analysisResult.analyzedCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((analysisResult.analyzedCount / analysisResult.starCount) * 100).toFixed(1)}% of total
                  </p>
                </CardContent>
              </Card>

              <Card className="neon-border-pink">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Unknown Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">
                    {analysisResult.unknownCount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((analysisResult.unknownCount / analysisResult.analyzedCount) * 100).toFixed(1)}% of analyzed
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Map Visualization */}
            <Card className="neon-border-blue accent-line-cyan accent-line-magenta">
              <CardHeader>
                <CardTitle className="text-2xl neon-glow-pink">
                  Geographic Distribution
                </CardTitle>
                <CardDescription>
                  {analysisResult.fullName} - Stargazers by Country
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorldMap data={mapData} loading={false} />
              </CardContent>
            </Card>

            {/* Country List */}
            <Card className="neon-border-cyan">
              <CardHeader>
                <CardTitle className="text-xl neon-glow-blue">
                  Country Breakdown
                </CardTitle>
                <CardDescription>
                  Top countries by stargazer count
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.countryDistribution
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map((country, index) => (
                      <div
                        key={country.countryCode}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold text-primary w-8">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{country.countryName}</div>
                            <div className="text-sm text-muted-foreground">
                              {country.countryCode}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xl font-bold neon-glow-pink">
                            {country.count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>
            Powered by GitHub API, Google Maps Geocoding, and ECharts
          </p>
        </div>
      </footer>
    </div>
  );
}
