export function TrendingClusters() {
    return (
        <div className="flex flex-col rounded-lg border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="font-semibold">Trending Stories</h3>
                <span className="text-xs text-gray-500">Not connected</span>
            </div>
            <div className="p-4">
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
                    No clusters yet. Clustering will appear after the processing engine runs.
                </div>
            </div>
        </div>
    );
}
