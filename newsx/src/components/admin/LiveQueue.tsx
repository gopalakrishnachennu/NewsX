export function LiveQueue() {
    return (
        <div className="flex flex-col rounded-lg border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="font-semibold">Live Queue Stream</h3>
                <span className="text-xs text-gray-500">Not connected</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-4">
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
                    No queue data yet. Connect the ingestion worker to display jobs here.
                </div>
            </div>
        </div>
    );
}
