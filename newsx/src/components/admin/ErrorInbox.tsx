"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, RefreshCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ErrorInbox() {
    const [errors, setErrors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchErrors = async () => {
        try {
            const res = await fetch("/api/admin/stats");
            if (res.ok) {
                const data = await res.json();
                setErrors(data.system.recentErrors || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchErrors();
    }, []);

    if (loading) return <div className="text-sm text-gray-400 p-4">Loading errors...</div>;

    if (errors.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">All Systems Go</h3>
                <p className="mt-1 text-xs text-gray-500">No active errors in the last 24 hours.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
            <div className="border-b border-red-100 bg-red-50/50 px-4 py-3 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Recent Errors
                </h3>
                <button onClick={fetchErrors} className="text-red-400 hover:text-red-700">
                    <RefreshCcw className="h-3 w-3" />
                </button>
            </div>
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {errors.map((err, i) => (
                    <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                            <p className="text-xs font-medium text-red-600 truncate max-w-[200px]">{err.message}</p>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {err.timestamp ? formatDistanceToNow(new Date(err.timestamp), { addSuffix: true }) : ''}
                            </span>
                        </div>
                        {err.context && (
                            <pre className="mt-2 text-[10px] text-gray-500 bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(err.context, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
