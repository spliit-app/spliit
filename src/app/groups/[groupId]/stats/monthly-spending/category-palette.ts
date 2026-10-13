const CHART_COLOR_COUNT = 5

export function getChartColor(index: number) {
  return `hsl(var(--chart-${(index % CHART_COLOR_COUNT) + 1}))`
}

export function getColorByCategory(categories: { key: string }[]) {
  return new Map(
    categories.map((category, index) => [category.key, getChartColor(index)]),
  )
}
