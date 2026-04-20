// src/app/login/LoginSkeleton.tsx
export default function LoginSkeleton() {
  return (
    <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-gray-100 sm:px-10">
      <div className="h-10 bg-gray-100 rounded-lg mb-6 animate-pulse" />
      <div className="space-y-4">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse mt-2" />
      </div>
    </div>
  )
}
