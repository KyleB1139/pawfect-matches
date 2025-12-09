import { useState, useEffect, useCallback } from "react";

export type DistanceUnit = "km" | "miles";

const STORAGE_KEY = "distance_unit";

export const useDistanceUnit = () => {
  const [unit, setUnit] = useState<DistanceUnit>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as DistanceUnit) || "km";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unit);
  }, [unit]);

  const toggleUnit = useCallback(() => {
    setUnit((prev) => (prev === "km" ? "miles" : "km"));
  }, []);

  const formatDistance = useCallback(
    (distanceKm: number): string => {
      if (unit === "miles") {
        const miles = distanceKm * 0.621371;
        return `${Math.round(miles)} mi`;
      }
      return `${Math.round(distanceKm)} km`;
    },
    [unit]
  );

  const convertToDisplay = useCallback(
    (distanceKm: number): number => {
      if (unit === "miles") {
        return distanceKm * 0.621371;
      }
      return distanceKm;
    },
    [unit]
  );

  const convertToKm = useCallback(
    (displayValue: number): number => {
      if (unit === "miles") {
        return displayValue / 0.621371;
      }
      return displayValue;
    },
    [unit]
  );

  return {
    unit,
    setUnit,
    toggleUnit,
    formatDistance,
    convertToDisplay,
    convertToKm,
  };
};
