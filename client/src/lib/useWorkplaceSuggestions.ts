import { useEffect, useState } from 'react';
import { listHazards } from './hazardsApi';

export interface WorkplaceSuggestions {
  workplaces: string[];
  departments: string[];
}

const EMPTY: WorkplaceSuggestions = { workplaces: [], departments: [] };

/**
 * Suggestions only — never a constraint. Derived from whatever workplace and
 * department names this organization has actually typed in before, so the
 * system adapts to any workplace structure instead of assuming a fixed list.
 */
export function useWorkplaceSuggestions(): WorkplaceSuggestions {
  const [suggestions, setSuggestions] = useState<WorkplaceSuggestions>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    listHazards()
      .then(({ items: hazards }) => {
        if (cancelled) return;
        setSuggestions({
          workplaces: Array.from(new Set(hazards.map((h) => h.workplace).filter(Boolean))).sort(),
          departments: Array.from(new Set(hazards.map((h) => h.department).filter(Boolean))).sort(),
        });
      })
      .catch(() => {
        // Suggestions are a convenience only — silently ignore failures.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return suggestions;
}
