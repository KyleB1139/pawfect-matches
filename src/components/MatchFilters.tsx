import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, X, MapPin, Heart } from "lucide-react";
import { useDistanceUnit } from "@/hooks/useDistanceUnit";

export const RELATIONSHIP_GOALS = [
  "Long-term relationship",
  "Casual dating",
  "New friends",
  "Not sure yet",
  "Marriage",
];

export interface MatchFilters {
  breed: string;
  minAge: number | null;
  maxAge: number | null;
  location: string;
  maxDistance: number | null; // in km
  lookingFor: string[]; // relationship goals filter
  matchMyLookingFor: boolean; // only show profiles with overlapping goals
}

interface MatchFiltersProps {
  filters: MatchFilters;
  onFiltersChange: (filters: MatchFilters) => void;
  availableBreeds: string[];
  availableLocations: string[];
  userHasLocation?: boolean;
  onRequestLocation?: () => void;
}

const MatchFiltersComponent = ({
  filters,
  onFiltersChange,
  availableBreeds,
  availableLocations,
  userHasLocation = false,
  onRequestLocation,
}: MatchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { unit, formatDistance, convertToDisplay, convertToKm } = useDistanceUnit();

  const hasActiveFilters =
    filters.breed ||
    filters.minAge !== null ||
    filters.maxAge !== null ||
    filters.location ||
    filters.maxDistance !== null ||
    filters.lookingFor.length > 0 ||
    filters.matchMyLookingFor;

  const clearFilters = () => {
    onFiltersChange({
      breed: "",
      minAge: null,
      maxAge: null,
      location: "",
      maxDistance: null,
      lookingFor: [],
      matchMyLookingFor: false,
    });
  };

  const toggleLookingFor = (goal: string) => {
    const updated = filters.lookingFor.includes(goal)
      ? filters.lookingFor.filter((g) => g !== goal)
      : [...filters.lookingFor, goal];
    onFiltersChange({ ...filters, lookingFor: updated });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[80vh]">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Filter Matches</SheetTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Clear all
            </Button>
          )}
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Distance Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Maximum Distance
            </Label>
            {userHasLocation ? (
              <>
                <Slider
                  value={[Math.round(convertToDisplay(filters.maxDistance ?? 100))]}
                  onValueChange={([value]) =>
                    onFiltersChange({ ...filters, maxDistance: Math.round(convertToKm(value)) })
                  }
                  min={1}
                  max={unit === "km" ? 100 : 62}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>1 {unit === "km" ? "km" : "mi"}</span>
                  <span className="font-medium text-foreground">
                    {formatDistance(filters.maxDistance ?? 100)}
                  </span>
                  <span>{unit === "km" ? "100 km" : "62 mi"}</span>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enable location to filter by distance
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRequestLocation}
                  className="gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Enable Location
                </Button>
              </div>
            )}
          </div>

          {/* Dog Breed Filter */}
          <div className="space-y-2">
            <Label>Dog Breed</Label>
            <Select
              value={filters.breed}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, breed: value === "all" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All breeds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All breeds</SelectItem>
                {availableBreeds.map((breed) => (
                  <SelectItem key={breed} value={breed}>
                    {breed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Age Range Filter */}
          <div className="space-y-2">
            <Label>Dog Age (years)</Label>
            <div className="flex gap-3 items-center">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                max={20}
                value={filters.minAge ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minAge: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-24"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                min={0}
                max={20}
                value={filters.maxAge ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    maxAge: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-24"
              />
            </div>
          </div>

          {/* Location Filter */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={filters.location}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, location: value === "all" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {availableLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Looking For Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Looking For
            </Label>
            
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
              <Checkbox
                id="matchMyLookingFor"
                checked={filters.matchMyLookingFor}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, matchMyLookingFor: checked === true })
                }
              />
              <label
                htmlFor="matchMyLookingFor"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Only show profiles matching my relationship goals
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or filter by specific goals:</p>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIP_GOALS.map((goal) => (
                  <Button
                    key={goal}
                    variant={filters.lookingFor.includes(goal) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleLookingFor(goal)}
                    className="text-xs"
                  >
                    {goal}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button className="w-full" onClick={() => setIsOpen(false)}>
          Apply Filters
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default MatchFiltersComponent;
