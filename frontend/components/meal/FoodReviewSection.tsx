"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImageIcon } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const badgeItem = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 24 },
  },
};

interface Props {
  foodItems?: string[];
  confidence?: number;
  source?: string;
  descriptions?: string[];
}

export default function FoodReviewSection({
  foodItems,
  confidence,
  source,
  descriptions,
}: Props) {
  const [items, setItems] = useState<string[]>(foodItems ?? []);

  useEffect(() => {
    if (foodItems) setItems(foodItems);
  }, [foodItems]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  if (!foodItems || foodItems.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <ImageIcon className="h-10 w-10 text-[var(--border)]" strokeWidth={1.5} />
        <p className="text-sm text-[var(--muted)]">
          Upload a meal image to see identified foods
        </p>
      </div>
    );
  }

  const confidencePercent = Math.round((confidence ?? 0) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="space-y-6"
    >
      <div>
        <h3 className="mb-4 font-instrument text-xl text-[var(--text)]">
          Identified foods
        </h3>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-wrap gap-2"
        >
          <AnimatePresence mode="popLayout">
            {items.map((food, index) => (
              <motion.div
                key={`${food}-${index}`}
                variants={badgeItem}
                layout
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-4 py-2 shadow-sm"
              >
                <span className="font-jakarta text-sm text-[var(--text)]">
                  {food}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text)]"
                  aria-label={`Remove ${food}`}
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {confidence != null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-jakarta text-sm text-[var(--muted)]">
              Confidence
            </span>
            <span className="font-ibm text-sm text-[var(--text)]">
              {confidencePercent}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <motion.div
              key={confidencePercent}
              initial={{ width: 0 }}
              animate={{ width: `${confidencePercent}%` }}
              transition={{ duration: 0.8, type: "spring", stiffness: 80, damping: 20 }}
              className="h-full rounded-full bg-[var(--blue)]"
            />
          </div>
        </div>
      )}

      {source && (
        <p className="font-ibm text-xs text-[var(--muted)]">
          Source: {source}
        </p>
      )}

      {descriptions && descriptions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-instrument text-base text-[var(--text)]">
            Descriptions
          </h4>
          <ul className="space-y-1.5">
            {descriptions.map((desc, i) => (
              <motion.li
                key={`${desc}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 200, damping: 24 }}
                className="flex items-start gap-2 font-jakarta text-sm text-[var(--muted)]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--blue)]/60" />
                {desc}
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
