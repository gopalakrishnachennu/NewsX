import { Feed } from "@/types";
import { Edit, RefreshCw, Trash2, Globe, Activity } from "lucide-react";

const MOCK_FEEDS: Feed[] = [
    {
        id: "f1", sourceId: "techcrunch", url: "https://techcrunch.com/feed/", type: "rss", active: true,
        health: { status: "healthy", reliabilityScore: 98, lastCheck: new Date(), errorCount24h: 0 }
    },
    {
        id: "f2", sourceId: "cnn", url: "https://cnn.com/rss/world.rss", type: "rss", active: true,
        health: { status: "warning", reliabilityScore: 75, lastCheck: new Date(), errorCount24h: 5 }
    },
    {
        id: "f3", sourceId: "bbc", url: "https://bbc.co.uk/sitemap.xml", type: "sitemap", active: false,
        health: { status: "error", reliabilityScore: 40, lastCheck: new Date(), errorCount24h: 24 }
    },
];

export function FeedList() {
    return (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source / URL</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Health</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {MOCK_FEEDS.map((feed) => (
                        <tr key={feed.id}>
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Globe className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900 capitalize">{feed.sourceId}</div>
                                        <div className="text-sm text-gray-500 truncate max-w-xs">{feed.url}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800 uppercase">
                                    {feed.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${feed.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {feed.active ? 'Active' : 'Paused'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <Activity className={`mr-2 h-4 w-4 ${feed.health.status === 'healthy' ? 'text-green-500' :
                                            feed.health.status === 'warning' ? 'text-yellow-500' : 'text-red-500'
                                        }`} />
                                    <span className="text-sm text-gray-700">{feed.health.reliabilityScore}%</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                    <button className="text-indigo-600 hover:text-indigo-900"><Edit className="h-4 w-4" /></button>
                                    <button className="text-gray-600 hover:text-gray-900"><RefreshCw className="h-4 w-4" /></button>
                                    <button className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
