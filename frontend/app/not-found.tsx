import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4 md:px-6 relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
        <div className="h-[40rem] w-[40rem] rounded-full bg-primary/30 blur-[100px] animate-pulse" />
      </div>

      <div className="z-10 flex flex-col items-center space-y-4 text-center">
        <h1 className="text-[8rem] font-extrabold tracking-tighter sm:text-[12rem] bg-gradient-to-b from-foreground to-muted-foreground/30 bg-clip-text text-transparent drop-shadow-sm">
          404
        </h1>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Lost in the digital void
          </h2>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            The page you are looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
          </p>
        </div>

        <div className="flex flex-col gap-3 min-[400px]:flex-row pt-8">
          <Button asChild size="lg" className="group">
            <Link href="/">
              <Home className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
              Return Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="group">
            <Link href="/app/workspace">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Workspace
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
