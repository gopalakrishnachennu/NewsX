"use client";

import { FeedList } from "@/components/admin/feeds/FeedList";
import { Plus } from "lucide-react";

export default function FeedsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Feed Manager</h2>
                    <p className="text-sm text-gray-500">Manage your RSS, Atom, and Sitemap sources</p>
                </div>
                <button className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    Add New Source
                </button>
            </div>

            <FeedList />
        </div>
    );
}
