"use client";

import { useMemo } from "react";
import {
  Sankey,
  Tooltip,
  ResponsiveContainer,
  Layer,
} from "recharts";

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyDiagramProps {
  data: {
    nodes: SankeyNode[];
    links: SankeyLink[];
  };
  width?: number;
  height?: number;
  title?: string;
}

// Sankey diagram for flow visualization
export function SankeyDiagram({
  data,
  width = 800,
  height = 400,
  title = "Flow Diagram",
}: SankeyDiagramProps) {
  const colors = [
    "#8884d8",
    "#83a6ed",
    "#8dd1e1",
    "#82ca9d",
    "#a4de6c",
    "#d0ed57",
    "#ffc658",
    "#ff7300",
    "#ff0000",
  ];

  const CustomNode = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    const fill = colors[index % colors.length];

    return (
      <Layer>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          fillOpacity="0.8"
          rx={4}
        />
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight="500"
        >
          {payload.name}
        </text>
      </Layer>
    );
  };

  const CustomLink = (props: any) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
    const path = `M${sourceX},${sourceY + linkWidth / 2}
      C${sourceControlX},${sourceY + linkWidth / 2} ${targetControlX},${targetY + linkWidth / 2} ${targetX},${targetY + linkWidth / 2}
      L${targetX},${targetY - linkWidth / 2}
      C${targetControlX},${targetY - linkWidth / 2} ${sourceControlX},${sourceY - linkWidth / 2} ${sourceX},${sourceY - linkWidth / 2}
      Z`;

    const fill = colors[index % colors.length];

    return (
      <Layer>
        <path
          d={path}
          fill={fill}
          fillOpacity="0.4"
          stroke="none"
          className="hover:fill-opacity-60 transition-all"
        />
      </Layer>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <Sankey
          data={data}
          nodePadding={20}
          margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
          linkCurvature={0.5}
          node={<CustomNode />}
          link={<CustomLink />}
        >
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
            }}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}

// Example usage data
export const exampleSankeyData = {
  nodes: [
    { name: "Website Visitors" },
    { name: "Signups" },
    { name: "Trial Users" },
    { name: "Paid Users" },
    { name: "Churned" },
  ],
  links: [
    { source: 0, target: 1, value: 5000 },
    { source: 0, target: 4, value: 5000 },
    { source: 1, target: 2, value: 3000 },
    { source: 1, target: 4, value: 2000 },
    { source: 2, target: 3, value: 1500 },
    { source: 2, target: 4, value: 1500 },
  ],
};
