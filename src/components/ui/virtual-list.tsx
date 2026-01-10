import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { listItemVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize: (index: number) => number;
  className?: string;
  itemClassName?: string;
  emptyComponent?: React.ReactNode;
  headerComponent?: React.ReactNode;
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize,
  className,
  itemClassName,
  emptyComponent,
  headerComponent,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateSize,
    overscan: 5,
  });

  if (items.length === 0 && emptyComponent) {
    return <>{emptyComponent}</>;
  }

  return (
    <div 
      ref={parentRef} 
      className={cn("h-full overflow-auto", className)}
    >
      {headerComponent}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        <AnimatePresence>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <motion.div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              variants={listItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn("absolute top-0 left-0 w-full", itemClassName)}
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(items[virtualRow.index], virtualRow.index)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
