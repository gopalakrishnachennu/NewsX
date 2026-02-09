"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { TemplateList } from "@/components/admin/studio/TemplateList";

export default function TemplatesPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
                    <p className="text-muted-foreground text-gray-500">
                        Manage your design templates for social media posts.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/admin/studio')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create New Template
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <TemplateList
                    onSelect={(template) => router.push(`/admin/studio/setup?templateId=${template.id}`)}
                />
            </div>
        </div>
    );
}
