import { cn } from "@/lib/utils";

export const BackgroundMesh = ({ className }: { className?: string }) => {
  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none select-none bg-[#02050e]", className)}>
      <div 
        className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-[#1a2035] opacity-[0.15] blur-[80px] animate-pulse" 
        style={{ animationDuration: '8s' }}
      />
      <div 
        className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-[#111827] opacity-[0.2] blur-[80px] animate-pulse" 
        style={{ animationDuration: '10s', animationDelay: '1s' }}
      />
      <div 
        className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full bg-[#1e293b] opacity-[0.15] blur-[60px] animate-pulse" 
        style={{ animationDuration: '12s', animationDelay: '2s' }}
      />
    </div>
  );
};
