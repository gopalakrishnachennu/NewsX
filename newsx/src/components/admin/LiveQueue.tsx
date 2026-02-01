// Local Badge implementation used below
import { QueueJob } from "@/types";
import { RefreshCw, XCircle } from "lucide-react";

// Mock data
const MOCK_JOBS: QueueJob[] = [
    { id: "j1", type: "fetch_url", priority: 10, status: "running", attempts: 1, nextRunAt: new Date() },
    { id: "j2", type: "process_article", priority: 5, status: "queued", attempts: 0, nextRunAt: new Date() },
    { id: "j3", type: "cluster_update", priority: 8, status: "failed", attempts: 3, nextRunAt: new Date() },
    { id: "j4", type: "sweep_feed", priority: 2, status: "running", attempts: 1, nextRunAt: new Date() },
];

export function LiveQueue() {
    return (
        <div className="flex flex-col rounded-lg border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="font-semibold">Live Queue Stream</h3>
                <span className="flex items-center gap-2 text-xs text-green-600">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    Live
                </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-4">
                <ul className="space-y-3">
                    {MOCK_JOBS.map((job) => (
                        <li key={job.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                            <div className="flex items-center gap-3">
                                <StatusBadge status={job.status} />
                                <div className="flex flex-col">
                                    <span className="font-medium">{job.type}</span>
                                    <span className="text-xs text-gray-500">ID: {job.id} • Attempts: {job.attempts}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {job.status === 'failed' && (
                                    <button className="rounded bg-gray-100 p-1 hover:bg-gray-200">
                                        <RefreshCw className="h-4 w-4 text-gray-600" />
                                    </button>
                                )}
                                <button className="rounded bg-gray-100 p-1 hover:bg-gray-200">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: QueueJob['status'] }) {
    const colors = {
        queued: 'bg-gray-100 text-gray-800',
        leased: 'bg-blue-100 text-blue-800',
        running: 'bg-indigo-100 text-indigo-800 animate-pulse',
        succeeded: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status]}`}>
            {status}
        </span>
    );
}
