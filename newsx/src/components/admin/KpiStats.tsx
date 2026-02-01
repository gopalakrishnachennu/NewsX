import { Activity, AlertTriangle, CloudLightning, DollarSign, Server } from "lucide-react";

export function KpiStats() {
    const stats = [
        { label: "Ingest / min", value: "124", icon: CloudLightning, color: "text-blue-600" },
        { label: "Jobs / min", value: "850", icon: Server, color: "text-indigo-600" },
        { label: "Failures / min", value: "2", icon: AlertTriangle, color: "text-red-500" },
        { label: "P95 Latency", value: "1.2s", icon: Activity, color: "text-green-600" },
        { label: "Cost Guard", value: "OK", icon: DollarSign, color: "text-emerald-600" },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">{stat.label}</span>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div className="mt-2 text-2xl font-bold">{stat.value}</div>
                </div>
            ))}
        </div>
    );
}
