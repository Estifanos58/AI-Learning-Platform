"use client";

import { cn } from "@/lib/utils";
import React from "react";

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: {
  items: {
    quote: string;
    name: string;
    title: string;
  }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const animationDirection = direction === "left" ? "forwards" : "reverse";
  const animationDuration = speed === "fast" ? "20s" : speed === "normal" ? "40s" : "80s";
  const renderedItems = [...items, ...items];

  return (
    <div
      className={cn(
        "scroller relative z-20  max-w-7xl overflow-hidden  [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className
      )}
      style={{
        ["--animation-direction" as string]: animationDirection,
        ["--animation-duration" as string]: animationDuration,
      }}
    >
      <ul
        className={cn(
          "flex min-w-full shrink-0 gap-4 py-4 w-max flex-nowrap",
          "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {renderedItems.map((item, idx) => (
          <li
            className="w-[350px] max-w-full relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm px-8 py-6 md:w-[450px]"
            style={{
               background: "linear-gradient(180deg, var(--card), var(--muted))",
            }}
            key={`${item.name}-${idx}`}
          >
            <blockquote>
              <div
                aria-hidden="true"
                className="user-select-none -z-1 pointer-events-none absolute -left-0.5 -top-0.5 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
              ></div>
              <p className=" relative z-20 text-sm leading-[1.6] text-card-foreground font-normal italic">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="relative z-20 mt-6 flex flex-row items-center">
                <span className="flex flex-col gap-1">
                  <span className=" text-sm leading-[1.6] text-primary font-semibold">
                    {item.name}
                  </span>
                  <span className=" text-xs leading-[1.6] text-muted-foreground font-normal">
                    {item.title}
                  </span>
                </span>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  );
};
