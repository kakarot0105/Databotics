"use client";

import {
  SankeyDiagram,
  exampleSankeyData,
} from "@/components/ui/sankey-diagram";
import {
  NetworkGraph,
  exampleNetworkData,
} from "@/components/ui/network-graph";
import {
  CandlestickChart,
  exampleCandlestickData,
} from "@/components/ui/candlestick-chart";
import {
  GeographicMap,
  exampleGeoData,
} from "@/components/ui/geographic-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdvancedVisualizationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
        Advanced Visualizations
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        New chart types for better data storytelling
      </p>

      <Tabs defaultValue="sankey" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sankey">Sankey Flow</TabsTrigger>
          <TabsTrigger value="network">Network Graph</TabsTrigger>
          <TabsTrigger value="candlestick">Candlestick</TabsTrigger>
          <TabsTrigger value="geo">Geographic Map</TabsTrigger>
        </TabsList>

        <TabsContent value="sankey" className="mt-6">
          <SankeyDiagram
            data={exampleSankeyData}
            title="User Conversion Funnel"
            height={500}
          />
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              About Sankey Diagrams
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visualize flow through stages. Perfect for:
              • Conversion funnels (visitors → signups → customers)
              • Budget allocation
              • Energy/resource flows
              • User journeys
            </p>
          </div>
        </TabsContent>

        <TabsContent value="network" className="mt-6">
          <NetworkGraph
            nodes={exampleNetworkData.nodes}
            edges={exampleNetworkData.edges}
            title="Social Network Connections"
            height={500}
            directed={false}
          />
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              About Network Graphs
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visualize relationships and connections. Perfect for:
              • Social networks
              • Organizational hierarchies
              • Dependency graphs
              • Recommendation systems
            </p>
          </div>
        </TabsContent>

        <TabsContent value="candlestick" className="mt-6">
          <CandlestickChart
            data={exampleCandlestickData}
            title="Stock Price Chart (30 Days)"
            height={400}
            showVolume={true}
          />
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              About Candlestick Charts
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analyze price movements over time. Perfect for:
              • Financial/stock data
              • Cryptocurrency tracking
              • Trading analysis
              • Price trend visualization
            </p>
          </div>
        </TabsContent>

        <TabsContent value="geo" className="mt-6">
          <GeographicMap
            data={exampleGeoData}
            title="Global User Distribution"
            height={450}
            colorScheme="blue"
          />
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              About Geographic Maps
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visualize data by location. Perfect for:
              • Sales by region
              • User demographics
              • Market penetration
              • Geographic trends
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">4</div>
          <div className="text-sm text-blue-800 dark:text-blue-300">New Chart Types</div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">0ms</div>
          <div className="text-sm text-green-800 dark:text-green-300">API Latency</div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">100%</div>
          <div className="text-sm text-purple-800 dark:text-purple-300">TypeScript</div>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">Dark</div>
          <div className="text-sm text-orange-800 dark:text-orange-300">Mode Ready</div>
        </div>
      </div>
    </div>
  );
}
