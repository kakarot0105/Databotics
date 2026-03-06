"use client";

import { useState } from "react";

interface GeoDataPoint {
  country: string;
  code: string;
  value: number;
  lat?: number;
  lng?: number;
}

interface GeographicMapProps {
  data: GeoDataPoint[];
  width?: number;
  height?: number;
  title?: string;
  colorScheme?: "blue" | "green" | "purple" | "orange";
}

// Simplified world map with major regions
const REGIONS: Record<string, { path: string; name: string }> = {
  NA: {
    path: "M150,100 L250,80 L300,120 L280,180 L200,200 L150,180 Z",
    name: "North America",
  },
  SA: {
    path: "M220,220 L280,220 L300,320 L250,380 L200,300 Z",
    name: "South America",
  },
  EU: {
    path: "M450,80 L550,70 L570,130 L520,150 L460,140 Z",
    name: "Europe",
  },
  AF: {
    path: "M450,160 L530,160 L550,280 L500,350 L460,280 Z",
    name: "Africa",
  },
  AS: {
    path: "M560,70 L750,60 L780,180 L650,200 L580,150 Z",
    name: "Asia",
  },
  OC: {
    path: "M650,250 L750,250 L760,320 L680,330 Z",
    name: "Oceania",
  },
};

// Geographic heatmap visualization
export function GeographicMap({
  data,
  width = 900,
  height = 500,
  title = "Geographic Distribution",
  colorScheme = "blue",
}: GeographicMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const colorSchemes = {
    blue: { min: "#dbeafe", max: "#1e40af", accent: "#3b82f6" },
    green: { min: "#dcfce7", max: "#166534", accent: "#22c55e" },
    purple: { min: "#f3e8ff", max: "#6b21a8", accent: "#a855f7" },
    orange: { min: "#ffedd5", max: "#9a3412", accent: "#f97316" },
  };

  const scheme = colorSchemes[colorScheme];

  // Get max value for normalization
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Get data for a region
  const getRegionData = (regionCode: string) => {
    const regionData = data.filter((d) => d.code === regionCode);
    return regionData.reduce((sum, d) => sum + d.value, 0);
  };

  // Get color intensity based on value
  const getColor = (regionCode: string) => {
    const value = getRegionData(regionCode);
    const intensity = value / maxValue;

    if (intensity === 0) return "#f3f4f6";

    // Interpolate between min and max colors
    const hex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    const minRgb = parseInt(scheme.min.slice(1), 16);
    const maxRgb = parseInt(scheme.max.slice(1), 16);

    const r = Math.round(((maxRgb >> 16) & 255) * intensity + ((minRgb >> 16) & 255) * (1 - intensity));
    const g = Math.round(((maxRgb >> 8) & 255) * intensity + ((minRgb >> 8) & 255) * (1 - intensity));
    const b = Math.round((maxRgb & 255) * intensity + (minRgb & 255) * (1 - intensity));

    return `#${hex(r)}${hex(g)}${hex(b)}`;
  };

  // Sort data for list view
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Map */}
        <div className="flex-1">
          <svg
            viewBox="0 0 900 500"
            width={width}
            height={height}
            className="w-full h-auto"
          >
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background */}
            <rect width="900" height="500" fill="#f8fafc" className="dark:fill-gray-800" />

            {/* Grid lines */}
            <g opacity="0.1">
              {[...Array(10)].map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i * 50}
                  x2="900"
                  y2={i * 50}
                  stroke="#94a3b8"
                />
              ))}
              {[...Array(18)].map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 50}
                  y1="0"
                  x2={i * 50}
                  y2="500"
                  stroke="#94a3b8"
                />
              ))}
            </g>

            {/* Regions */}
            {Object.entries(REGIONS).map(([code, region]) => {
              const value = getRegionData(code);
              const isHovered = hoveredRegion === code;
              const isSelected = selectedRegion === code;

              return (
                <g
                  key={code}
                  onMouseEnter={() => setHoveredRegion(code)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => setSelectedRegion(code === selectedRegion ? null : code)}
                  className="cursor-pointer transition-all"
                >
                  <path
                    d={region.path}
                    fill={getColor(code)}
                    stroke={isHovered || isSelected ? scheme.accent : "#94a3b8"}
                    strokeWidth={isHovered || isSelected ? 3 : 1}
                    className="transition-all duration-200"
                    filter={isHovered ? "url(#glow)" : undefined}
                  />
                  {/* Region label */}
                  <text
                    x={region.path.split(" ")[0].split(",")[0].slice(1)}
                    y={parseInt(region.path.split(" ")[1].split(",")[1]) + 20}
                    textAnchor="middle"
                    fill={isHovered || isSelected ? "#1e293b" : "#64748b"}
                    fontSize="12"
                    fontWeight={isHovered || isSelected ? "600" : "400"}
                    className="dark:fill-white pointer-events-none"
                  >
                    {region.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Low</span>
            <div
              className="h-4 w-48 rounded"
              style={{
                background: `linear-gradient(to right, ${scheme.min}, ${scheme.max})`,
              }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">High</span>
          </div>
        </div>

        {/* Data list */}
        <div className="lg:w-64">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Top Regions
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedData.slice(0, 10).map((item, index) => (
              <div
                key={item.code}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                  selectedRegion === item.code
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() =>
                  setSelectedRegion(item.code === selectedRegion ? null : item.code)
                }
                onMouseEnter={() => setHoveredRegion(item.code)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-5">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.country}
                  </span>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: scheme.accent }}
                >
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {selectedRegion && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                {REGIONS[selectedRegion]?.name}
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Total: {getRegionData(selectedRegion).toLocaleString()} {data[0]?.value > 1000 ? "views" : "units"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Example usage data
export const exampleGeoData: GeoDataPoint[] = [
  { country: "United States", code: "NA", value: 45000, lat: 37.09, lng: -95.71 },
  { country: "Canada", code: "NA", value: 15000, lat: 56.13, lng: -106.34 },
  { country: "Mexico", code: "NA", value: 12000, lat: 23.63, lng: -102.55 },
  { country: "Brazil", code: "SA", value: 18000, lat: -14.23, lng: -51.92 },
  { country: "Argentina", code: "SA", value: 8000, lat: -38.41, lng: -63.61 },
  { country: "United Kingdom", code: "EU", value: 22000, lat: 55.37, lng: -3.43 },
  { country: "Germany", code: "EU", value: 28000, lat: 51.16, lng: 10.45 },
  { country: "France", code: "EU", value: 19000, lat: 46.22, lng: 2.21 },
  { country: "Nigeria", code: "AF", value: 11000, lat: 9.08, lng: 8.67 },
  { country: "South Africa", code: "AF", value: 9000, lat: -30.55, lng: 22.93 },
  { country: "China", code: "AS", value: 52000, lat: 35.86, lng: 104.19 },
  { country: "Japan", code: "AS", value: 31000, lat: 36.2, lng: 138.25 },
  { country: "India", code: "AS", value: 38000, lat: 20.59, lng: 78.96 },
  { country: "Australia", code: "OC", value: 16000, lat: -25.27, lng: 133.77 },
];
