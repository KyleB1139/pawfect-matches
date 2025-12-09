import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Filter, X } from "lucide-react";

export interface MatchFilters {
  breed: string;
  minAge: number | null;
  maxAge: number | null;
  location: string;
}

interface MatchFiltersProps {
  filters: MatchFilters;
  onFiltersChange: (filters: MatchFilters) => void;
  availableBreeds: string[];
  availableLocations: string[];
}

const MatchFiltersComponent = ({
  filters,
  onFiltersChange,
  availableBreeds,
  availableLocations,
}: MatchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    filters.breed ||
    filters.minAge !== null ||
    filters.maxAge !== null ||
    filters.location;

  const clearFilters = () => {
    onFiltersChange({
      breed: "",
      minAge: null,
      maxAge: null,
      location: "",
    });
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
        </div>

        <Button className="w-full" onClick={() => setIsOpen(false)}>
          Apply Filters
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default MatchFiltersComponent;
