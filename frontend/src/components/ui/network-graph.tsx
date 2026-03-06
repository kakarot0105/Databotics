"use client";

import { useRef, useEffect, useState } from "react";

interface NetworkNode {
  id: string;
  label: string;
  group?: number;
  value?: number;
  x?: number;
  y?: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  value?: number;
}

interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  width?: number;
  height?: number;
  title?: string;
  directed?: boolean;
}

// Network graph for relationship visualization
export function NetworkGraph({
  nodes: initialNodes,
  edges,
  width = 800,
  height = 600,
  title = "Network Graph",
  directed = false,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<[string, string] | null>(null);

  // Initialize node positions using force-directed layout
  useEffect(() => {
    const initializedNodes = initialNodes.map((node, i) => ({
      ...node,
      x: node.x || width / 2 + Math.cos((2 * Math.PI * i) / initialNodes.length) * 200,
      y: node.y || height / 2 + Math.sin((2 * Math.PI * i) / initialNodes.length) * 200,
    }));

    // Simple force simulation
    let iterations = 100;
    const simulationNodes = [...initializedNodes];
    
    while (iterations > 0) {
      // Repulsion
      for (let i = 0; i < simulationNodes.length; i++) {
        for (let j = i + 1; j < simulationNodes.length; j++) {
          const dx = simulationNodes[j].x! - simulationNodes[i].x!;
          const dy = simulationNodes[j].y! - simulationNodes[i].y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          simulationNodes[i].x! -= fx;
          simulationNodes[i].y! -= fy;
          simulationNodes[j].x! += fx;
          simulationNodes[j].y! += fy;
        }
      }

      // Attraction (edges pull nodes together)
      edges.forEach((edge) => {
        const source = simulationNodes.find((n) => n.id === edge.source);
        const target = simulationNodes.find((n) => n.id === edge.target);
        if (source && target) {
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 100) * 0.01;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          source.x! += fx;
          source.y! += fy;
          target.x! -= fx;
          target.y! -= fy;
        }
      });

      // Center gravity
      simulationNodes.forEach((node) => {
        const dx = width / 2 - node.x!;
        const dy = height / 2 - node.y!;
        node.x! += dx * 0.01;
        node.y! += dy * 0.01;
      });

      iterations--;
    }

    setNodes(simulationNodes);
  }, [initialNodes, edges, width, height]);

  const colors = [
    "#8884d8",
    "#83a6ed",
    "#8dd1e1",
    "#82ca9d",
    "#a4de6c",
    "#ffc658",
    "#ff7300",
  ];

  const getNodeColor = (node: NetworkNode) => {
    if (hoveredNode === node.id) return "#ff6b6b";
    return colors[(node.group || 0) % colors.length];
  };

  const isEdgeHighlighted = (source: string, target: string) => {
    if (!hoveredNode) return false;
    return source === hoveredNode || target === hoveredNode;
  };

  const isNodeConnected = (nodeId: string) => {
    if (!hoveredNode) return false;
    return (
      hoveredNode === nodeId ||
      edges.some(
        (e) =>
          (e.source === hoveredNode && e.target === nodeId) ||
          (e.target === hoveredNode && e.source === nodeId)
      )
    );
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full"
        style={{ minHeight: height }}
      >
        <g>
          {/* Edges */}
          {edges.map((edge, i) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            const highlighted = isEdgeHighlighted(edge.source, edge.target);
            const dimmed = hoveredNode && !highlighted;

            return (
              <g key={`${edge.source}-${edge.target}-${i}`}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={highlighted ? "#ff6b6b" : "#94a3b8"}
                  strokeWidth={highlighted ? 3 : edge.value ? Math.max(1, edge.value / 2) : 1.5}
                  opacity={dimmed ? 0.2 : 0.6}
                  onMouseEnter={() => setHoveredEdge([edge.source, edge.target])}
                  onMouseLeave={() => setHoveredEdge(null)}
                  className="cursor-pointer transition-all"
                />
                {directed && (
                  <polygon
                    points={`${target.x},${target.y} ${target.x - 10},${target.y - 5} ${target.x - 10},${target.y + 5}`}
                    fill={highlighted ? "#ff6b6b" : "#94a3b8"}
                    opacity={dimmed ? 0.2 : 0.8}
                    transform={`rotate(${(Math.atan2(target.y! - source.y!, target.x! - source.x!) * 180) / Math.PI}, ${target.x}, ${target.y})`}
                  />
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const connected = isNodeConnected(node.id);
            const dimmed = hoveredNode && !connected;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                <circle
                  r={node.value ? Math.max(15, node.value / 2) : 20}
                  fill={getNodeColor(node)}
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={dimmed ? 0.3 : 1}
                  className="transition-all hover:scale-110"
                />
                <text
                  dy={35}
                  textAnchor="middle"
                  fill={dimmed ? "#94a3b8" : "#1e293b"}
                  fontSize={12}
                  fontWeight="500"
                  className="dark:fill-white transition-all"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// Example usage data
export const exampleNetworkData = {
  nodes: [
    { id: "A", label: "Alice", group: 0, value: 30 },
    { id: "B", label: "Bob", group: 0, value: 25 },
    { id: "C", label: "Charlie", group: 1, value: 20 },
    { id: "D", label: "David", group: 1, value: 35 },
    { id: "E", label: "Eve", group: 2, value: 28 },
    { id: "F", label: "Frank", group: 2, value: 22 },
  ],
  edges: [
    { source: "A", target: "B", value: 5 },
    { source: "A", target: "C", value: 3 },
    { source: "B", target: "D", value: 4 },
    { source: "C", target: "D", value: 6 },
    { source: "D", target: "E", value: 2 },
    { source: "E", target: "F", value: 5 },
    { source: "F", target: "A", value: 3 },
  ],
};
