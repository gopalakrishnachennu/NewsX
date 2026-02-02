import Link from "next/link";
import { ArrowRight, Newspaper, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold tracking-tight">NewsX</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go to Console
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            News Intelligence Platform
          </h1>
          <p className="text-lg text-gray-600">
            A serverless, Firestore-first engine for real-time news aggregation,
            clustering, and narrative detection.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              href="/admin"
              className="group flex items-center gap-2 rounded-md bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800"
            >
              Access Admin Console
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} NewsX Platform. Internal Tool.
      </footer>
    </div>
  );
}
