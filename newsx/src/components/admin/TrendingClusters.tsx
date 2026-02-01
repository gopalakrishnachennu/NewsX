import { Cluster } from "@/types";
import { MoveUpRight, Pin, EyeOff } from "lucide-react";

const MOCK_CLUSTERS: Cluster[] = [
    {
        id: "c1", title: "Global Market Rally continues after Fed announcement",
        category: "Finance", hotnessScore: 98, velocity: 12.5, articleCount: 42,
        summaryBullets: [], updatedAt: new Date()
    },
    {
        id: "c2", title: "Major tech breakthrough in AI reasoning models",
        category: "Tech", hotnessScore: 85, velocity: 8.2, articleCount: 15,
        summaryBullets: [], updatedAt: new Date()
    },
    {
        id: "c3", title: "Election updates from multiple regions",
        category: "Politics", hotnessScore: 72, velocity: 5.1, articleCount: 104,
        summaryBullets: [], updatedAt: new Date()
    },
];

export function TrendingClusters() {
    return (
        <div className="flex flex-col rounded-lg border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="font-semibold">Trending Stories</h3>
                <button className="text-sm text-blue-600 hover:underline">View All</button>
            </div>
            <div className="p-4">
                <div className="space-y-4">
                    {MOCK_CLUSTERS.map(cluster => (
                        <div key={cluster.id} className="group relative flex items-start gap-3 rounded-lg border p-3 hover:bg-gray-50">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-blue-50 font-bold text-blue-600">
                                {cluster.hotnessScore}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                    {cluster.title}
                                    {cluster.velocity > 10 && <MoveUpRight className="h-3 w-3 text-red-500" />}
                                </h4>
                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5">{cluster.category}</span>
                                    <span>• {cluster.articleCount} articles</span>
                                    <span>• +{cluster.velocity}/hr</span>
                                </div>
                            </div>
                            <div className="absolute right-2 top-2 hidden gap-2 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100">
                                <button className="rounded p-1 hover:bg-white hover:shadow">
                                    <Pin className="h-4 w-4 text-gray-400 hover:text-blue-500" />
                                </button>
                                <button className="rounded p-1 hover:bg-white hover:shadow">
                                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-red-500" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
