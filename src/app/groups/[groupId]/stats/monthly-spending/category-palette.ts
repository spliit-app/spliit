export type CategoryColor = {
  backgroundClassName: string
  borderClassName: string
  foregroundClassName: string
}

export type PaletteCategory = {
  key: string
  categoryId: number | null
  grouping: string
  name: string
}

const CATEGORY_COLORS_BY_GROUP: Record<string, CategoryColor[]> = {
  Uncategorized: [
    getCategoryColor(
      'bg-slate-200 dark:bg-slate-800',
      'border-slate-300 dark:border-slate-700',
      'text-slate-950 dark:text-slate-50',
    ),
    getCategoryColor(
      'bg-zinc-200 dark:bg-zinc-800',
      'border-zinc-300 dark:border-zinc-700',
      'text-zinc-950 dark:text-zinc-50',
    ),
  ],
  Entertainment: [
    getCategoryColor(
      'bg-rose-200 dark:bg-rose-900',
      'border-rose-300 dark:border-rose-800',
      'text-rose-950 dark:text-rose-50',
    ),
    getCategoryColor(
      'bg-pink-200 dark:bg-pink-900',
      'border-pink-300 dark:border-pink-800',
      'text-pink-950 dark:text-pink-50',
    ),
    getCategoryColor(
      'bg-fuchsia-200 dark:bg-fuchsia-900',
      'border-fuchsia-300 dark:border-fuchsia-800',
      'text-fuchsia-950 dark:text-fuchsia-50',
    ),
  ],
  'Food and Drink': [
    getCategoryColor(
      'bg-emerald-200 dark:bg-emerald-900',
      'border-emerald-300 dark:border-emerald-800',
      'text-emerald-950 dark:text-emerald-50',
    ),
    getCategoryColor(
      'bg-green-200 dark:bg-green-900',
      'border-green-300 dark:border-green-800',
      'text-green-950 dark:text-green-50',
    ),
    getCategoryColor(
      'bg-lime-200 dark:bg-lime-900',
      'border-lime-300 dark:border-lime-800',
      'text-lime-950 dark:text-lime-50',
    ),
    getCategoryColor(
      'bg-teal-200 dark:bg-teal-900',
      'border-teal-300 dark:border-teal-800',
      'text-teal-950 dark:text-teal-50',
    ),
  ],
  Home: [
    getCategoryColor(
      'bg-sky-200 dark:bg-sky-900',
      'border-sky-300 dark:border-sky-800',
      'text-sky-950 dark:text-sky-50',
    ),
    getCategoryColor(
      'bg-blue-200 dark:bg-blue-900',
      'border-blue-300 dark:border-blue-800',
      'text-blue-950 dark:text-blue-50',
    ),
    getCategoryColor(
      'bg-cyan-200 dark:bg-cyan-900',
      'border-cyan-300 dark:border-cyan-800',
      'text-cyan-950 dark:text-cyan-50',
    ),
  ],
  Life: [
    getCategoryColor(
      'bg-violet-200 dark:bg-violet-900',
      'border-violet-300 dark:border-violet-800',
      'text-violet-950 dark:text-violet-50',
    ),
    getCategoryColor(
      'bg-purple-200 dark:bg-purple-900',
      'border-purple-300 dark:border-purple-800',
      'text-purple-950 dark:text-purple-50',
    ),
    getCategoryColor(
      'bg-fuchsia-200 dark:bg-fuchsia-900',
      'border-fuchsia-300 dark:border-fuchsia-800',
      'text-fuchsia-950 dark:text-fuchsia-50',
    ),
  ],
  Transportation: [
    getCategoryColor(
      'bg-indigo-200 dark:bg-indigo-900',
      'border-indigo-300 dark:border-indigo-800',
      'text-indigo-950 dark:text-indigo-50',
    ),
    getCategoryColor(
      'bg-cyan-200 dark:bg-cyan-900',
      'border-cyan-300 dark:border-cyan-800',
      'text-cyan-950 dark:text-cyan-50',
    ),
    getCategoryColor(
      'bg-blue-200 dark:bg-blue-900',
      'border-blue-300 dark:border-blue-800',
      'text-blue-950 dark:text-blue-50',
    ),
  ],
  Utilities: [
    getCategoryColor(
      'bg-amber-200 dark:bg-amber-900',
      'border-amber-300 dark:border-amber-800',
      'text-amber-950 dark:text-amber-50',
    ),
    getCategoryColor(
      'bg-yellow-200 dark:bg-yellow-900',
      'border-yellow-300 dark:border-yellow-800',
      'text-yellow-950 dark:text-yellow-50',
    ),
    getCategoryColor(
      'bg-orange-200 dark:bg-orange-900',
      'border-orange-300 dark:border-orange-800',
      'text-orange-950 dark:text-orange-50',
    ),
  ],
}

const FALLBACK_CATEGORY_COLORS = [
  getCategoryColor(
    'bg-slate-200 dark:bg-slate-800',
    'border-slate-300 dark:border-slate-700',
    'text-slate-950 dark:text-slate-50',
  ),
  getCategoryColor(
    'bg-stone-200 dark:bg-stone-800',
    'border-stone-300 dark:border-stone-700',
    'text-stone-950 dark:text-stone-50',
  ),
  getCategoryColor(
    'bg-neutral-200 dark:bg-neutral-800',
    'border-neutral-300 dark:border-neutral-700',
    'text-neutral-950 dark:text-neutral-50',
  ),
]

const DETAILED_CATEGORY_COLORS_BY_KEY: Record<string, CategoryColor> = {
  'Utilities:Cleaning': getCategoryColor(
    'bg-teal-200 dark:bg-teal-900',
    'border-teal-300 dark:border-teal-800',
    'text-teal-950 dark:text-teal-50',
  ),
  'Utilities:Electricity': getCategoryColor(
    'bg-yellow-200 dark:bg-yellow-900',
    'border-yellow-300 dark:border-yellow-800',
    'text-yellow-950 dark:text-yellow-50',
  ),
  'Utilities:Heat/Gas': getCategoryColor(
    'bg-orange-200 dark:bg-orange-900',
    'border-orange-300 dark:border-orange-800',
    'text-orange-950 dark:text-orange-50',
  ),
  'Utilities:Trash': getCategoryColor(
    'bg-slate-200 dark:bg-slate-800',
    'border-slate-300 dark:border-slate-700',
    'text-slate-950 dark:text-slate-50',
  ),
  'Utilities:TV/Phone/Internet': getCategoryColor(
    'bg-sky-200 dark:bg-sky-900',
    'border-sky-300 dark:border-sky-800',
    'text-sky-950 dark:text-sky-50',
  ),
  'Utilities:Water': getCategoryColor(
    'bg-blue-200 dark:bg-blue-900',
    'border-blue-300 dark:border-blue-800',
    'text-blue-950 dark:text-blue-50',
  ),
}

const DETAILED_CATEGORY_COLOR_SPECTRUM = [
  getCategoryColor(
    'bg-emerald-200 dark:bg-emerald-900',
    'border-emerald-300 dark:border-emerald-800',
    'text-emerald-950 dark:text-emerald-50',
  ),
  getCategoryColor(
    'bg-sky-200 dark:bg-sky-900',
    'border-sky-300 dark:border-sky-800',
    'text-sky-950 dark:text-sky-50',
  ),
  getCategoryColor(
    'bg-amber-200 dark:bg-amber-900',
    'border-amber-300 dark:border-amber-800',
    'text-amber-950 dark:text-amber-50',
  ),
  getCategoryColor(
    'bg-violet-200 dark:bg-violet-900',
    'border-violet-300 dark:border-violet-800',
    'text-violet-950 dark:text-violet-50',
  ),
  getCategoryColor(
    'bg-rose-200 dark:bg-rose-900',
    'border-rose-300 dark:border-rose-800',
    'text-rose-950 dark:text-rose-50',
  ),
  getCategoryColor(
    'bg-teal-200 dark:bg-teal-900',
    'border-teal-300 dark:border-teal-800',
    'text-teal-950 dark:text-teal-50',
  ),
  getCategoryColor(
    'bg-indigo-200 dark:bg-indigo-900',
    'border-indigo-300 dark:border-indigo-800',
    'text-indigo-950 dark:text-indigo-50',
  ),
  getCategoryColor(
    'bg-lime-200 dark:bg-lime-900',
    'border-lime-300 dark:border-lime-800',
    'text-lime-950 dark:text-lime-50',
  ),
  getCategoryColor(
    'bg-orange-200 dark:bg-orange-900',
    'border-orange-300 dark:border-orange-800',
    'text-orange-950 dark:text-orange-50',
  ),
  getCategoryColor(
    'bg-cyan-200 dark:bg-cyan-900',
    'border-cyan-300 dark:border-cyan-800',
    'text-cyan-950 dark:text-cyan-50',
  ),
  getCategoryColor(
    'bg-fuchsia-200 dark:bg-fuchsia-900',
    'border-fuchsia-300 dark:border-fuchsia-800',
    'text-fuchsia-950 dark:text-fuchsia-50',
  ),
  getCategoryColor(
    'bg-blue-200 dark:bg-blue-900',
    'border-blue-300 dark:border-blue-800',
    'text-blue-950 dark:text-blue-50',
  ),
]

function getCategoryColor(
  backgroundClassName: string,
  borderClassName: string,
  foregroundClassName: string,
): CategoryColor {
  return {
    backgroundClassName,
    borderClassName,
    foregroundClassName,
  }
}

export function getColorByCategory(categories: PaletteCategory[]) {
  return new Map(
    categories.map((category) => [category.key, getCategoryColorFor(category)]),
  )
}

function getCategoryColorFor(category: PaletteCategory) {
  if (category.categoryId !== null) {
    const detailedColor =
      DETAILED_CATEGORY_COLORS_BY_KEY[category.grouping + ':' + category.name]

    if (detailedColor) return detailedColor

    return DETAILED_CATEGORY_COLOR_SPECTRUM[
      Math.abs(category.categoryId) % DETAILED_CATEGORY_COLOR_SPECTRUM.length
    ]
  }

  const palette =
    CATEGORY_COLORS_BY_GROUP[category.grouping] ?? FALLBACK_CATEGORY_COLORS

  return palette[0]
}
