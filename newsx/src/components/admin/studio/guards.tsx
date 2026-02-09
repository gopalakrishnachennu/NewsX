"use client";

import { useAdminStore, useAuthStore } from "@/lib/stores";
import { AdminSettings, FeatureConfig } from "@/lib/types";
import { Loader2, Construction } from "lucide-react";

interface FeatureGateProps {
    feature?: keyof AdminSettings["features"];
    permission?: string;
    tier?: "free" | "pro" | "enterprise";
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showUpgrade?: boolean;
}

export function FeatureGate({
    feature,
    permission,
    tier,
    children,
    fallback,
    showUpgrade = true,
}: FeatureGateProps) {
    const { settings, isMaintenanceMode } = useAdminStore();
    const { user, hasPermission, getTier, isAdmin } = useAuthStore();

    // Admins bypass all feature restrictions
    if (isAdmin()) {
        return <>{children}</>;
    }

    // Check maintenance mode
    if (isMaintenanceMode() && user?.role !== "admin") {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <Construction className="w-12 h-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Maintenance Mode</h3>
                <p className="text-gray-500">{settings.maintenance.message}</p>
            </div>
        );
    }

    // Check feature flag with tier-based access
    if (feature) {
        const featureConfig = settings.features[feature];

        // Handle both old (boolean) and new (FeatureConfig) formats
        const isEnabled = typeof featureConfig === 'boolean'
            ? featureConfig
            : (featureConfig as FeatureConfig)?.enabled ?? false;

        if (!isEnabled) {
            if (fallback) return <>{fallback}</>;
            return null;
        }

        // Check if user's tier has access
        if (typeof featureConfig !== 'boolean') {
            const config = featureConfig as FeatureConfig;
            const userTier = getTier();
            const userRole = user?.role;

            // Admin and moderator roles always have access (elevated roles)
            const hasElevatedRole = userRole === 'admin' || userRole === 'moderator';
            if (hasElevatedRole) {
                // Elevated roles bypass tier restrictions
                return <>{children}</>;
            }

            // For regular users, check if their TIER is in the allowed list
            const hasTierAccess = config.allowedTiers?.includes(userTier as any) ?? false;

            if (!hasTierAccess) {
                if (fallback) return <>{fallback}</>;
                if (showUpgrade) {
                    return (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-2xl">⭐</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Pro Feature</h3>
                            <p className="text-gray-500 mb-4">
                                Upgrade to Pro to access this feature
                            </p>
                            <a href="/pricing" className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition">
                                Upgrade to Pro
                            </a>
                        </div>
                    );
                }
                return null;
            }
        }
    }

    // Check permission
    if (permission && !hasPermission(permission)) {
        if (fallback) return <>{fallback}</>;
        if (showUpgrade) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">🔒</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
                    <p className="text-gray-500 mb-4">
                        Upgrade to Pro to unlock this feature
                    </p>
                    <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition">
                        Upgrade Now
                    </button>
                </div>
            );
        }
        return null;
    }

    // Check explicit tier requirement
    if (tier) {
        const tierOrder = ["free", "pro", "enterprise"];
        const userTierIndex = tierOrder.indexOf(getTier());
        const requiredTierIndex = tierOrder.indexOf(tier);

        if (userTierIndex < requiredTierIndex) {
            if (fallback) return <>{fallback}</>;
            if (showUpgrade) {
                return (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">⭐</span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{tier.charAt(0).toUpperCase() + tier.slice(1)} Feature</h3>
                        <p className="text-gray-500 mb-4">
                            Upgrade to {tier} to access this feature
                        </p>
                        <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition">
                            Upgrade to {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </button>
                    </div>
                );
            }
            return null;
        }
    }

    return <>{children}</>;
}

// Loading component
export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">{message}</p>
            </div>
        </div>
    );
}

// Auth guard component
export function AuthGuard({
    children,
    requireAdmin = false,
}: {
    children: React.ReactNode;
    requireAdmin?: boolean;
}) {
    const { user, isLoading, isInitialized } = useAuthStore();

    if (!isInitialized || isLoading) {
        return <LoadingScreen message="Authenticating..." />;
    }

    if (!user) {
        // Redirect to login or show login prompt
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">🔐</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
                    <p className="text-gray-500 mb-6">
                        Please sign in to access the Post Designer
                    </p>
                    <a
                        href="/login"
                        className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition font-medium"
                    >
                        Sign In
                    </a>
                </div>
            </div>
        );
    }

    if (requireAdmin && user.role !== "admin") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">⛔</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-gray-500 mb-6">
                        You don&#39;t have permission to access this area
                    </p>
                    <a
                        href="/dashboard"
                        className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                    >
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
