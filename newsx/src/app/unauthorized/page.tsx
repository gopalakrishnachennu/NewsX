import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-red-600">Access Denied</h1>
                <p className="mt-4 text-lg text-gray-600">
                    You do not have permission to view this page.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                    Please contact your administrator if you believe this is a mistake.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <Link
                        href="/admin"
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Back to Console
                    </Link>
                    <Link
                        href="/"
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
