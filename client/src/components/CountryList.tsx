import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Country {
  countryCode: string;
  countryName: string;
  count: number;
}

interface CountryListProps {
  countries: Country[];
}

type SortField = 'name' | 'count' | 'rank';
type SortDirection = 'asc' | 'desc';

export default function CountryList({ countries }: CountryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Calculate total count for percentage
  const totalCount = useMemo(() => {
    return countries.reduce((sum, country) => sum + country.count, 0);
  }, [countries]);

  // Filter and sort countries
  const filteredAndSortedCountries = useMemo(() => {
    let result = [...countries];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (country) =>
          country.countryName.toLowerCase().includes(query) ||
          country.countryCode.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.countryName.localeCompare(b.countryName);
      } else if (sortField === 'count') {
        comparison = a.count - b.count;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [countries, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'count' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  return (
    <Card className="border-secondary/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl">Country Distribution</CardTitle>
        <CardDescription>
          Complete list of {countries.length} countries with stargazers
        </CardDescription>
        
        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Sort Controls */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort('count')}
            className="gap-2"
          >
            Count
            <SortIcon field="count" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort('name')}
            className="gap-2"
          >
            Name
            <SortIcon field="name" />
          </Button>
        </div>

        {/* Country List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {filteredAndSortedCountries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No countries found matching "{searchQuery}"
            </p>
          ) : (
            filteredAndSortedCountries.map((country, index) => {
              const originalIndex = countries.findIndex((c) => c.countryCode === country.countryCode);
              const percentage = ((country.count / totalCount) * 100).toFixed(1);
              const maxCount = countries[0].count;
              const barWidth = (country.count / maxCount) * 100;

              return (
                <div
                  key={country.countryCode}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="text-sm font-medium text-muted-foreground w-8 text-right">
                      #{originalIndex + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{country.countryName}</span>
                        <span className="text-xs text-muted-foreground">({country.countryCode})</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {percentage}%
                    </span>
                    <span className="font-bold text-primary w-16 text-right">
                      {country.count.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Results Summary */}
        {searchQuery && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Showing {filteredAndSortedCountries.length} of {countries.length} countries
          </p>
        )}
      </CardContent>
    </Card>
  );
}
