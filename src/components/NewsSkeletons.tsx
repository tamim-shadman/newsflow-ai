import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const NewsCardSkeleton = () => {
  return (
    <div className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-white/5 border-2 border-white/10 shadow-xl">
        <div className="relative h-56 overflow-hidden">
          <Skeleton className="w-full h-full bg-white/10" />
        </div>

        <div className="p-6">
          <Skeleton className="h-6 w-3/4 mb-3 bg-white/10" />
          <Skeleton className="h-4 w-full mb-2 bg-white/10" />
          <Skeleton className="h-4 w-2/3 mb-4 bg-white/10" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-3 w-20 bg-white/10" />
              <Skeleton className="h-3 w-20 bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FeaturedSkeleton = () => {
  return (
    <div className="relative h-[550px] rounded-3xl overflow-hidden shadow-2xl ring-2 ring-white/10 bg-white/5">
      <Skeleton className="w-full h-full bg-white/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-10">
        <div className="flex items-center space-x-3 mb-5">
          <Skeleton className="h-8 w-24 rounded-full bg-white/20" />
          <Skeleton className="h-8 w-32 rounded-full bg-white/20" />
        </div>
        <Skeleton className="h-12 w-4/5 mb-4 bg-white/20" />
        <Skeleton className="h-6 w-full mb-2 bg-white/20" />
        <Skeleton className="h-6 w-3/4 mb-6 bg-white/20" />
        <Skeleton className="h-12 w-40 rounded-full bg-white/20" />
      </div>
    </div>
  );
};

export const NewsGridSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, idx) => (
        <NewsCardSkeleton key={idx} />
      ))}
    </div>
  );
};
