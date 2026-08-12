export function normalizeNumberInput(
  value: string,
  options: { decimalDigits?: number } = {},
) {
  const valueWithoutLeadingDecoration = value
    .trimStart()
    .replace(/^[^\d,.-]+/, '')
  const isNegative = valueWithoutLeadingDecoration.startsWith('-')
  const numericValue = value.replace(/[^\d.,]/g, '')

  if (numericValue.length === 0) return isNegative ? '-' : ''

  const separatorMatches = numericValue.match(/[.,]/g) ?? []
  if (separatorMatches.length === 0) {
    return `${isNegative ? '-' : ''}${numericValue}`
  }

  const dotCount = separatorMatches.filter(
    (separator) => separator === '.',
  ).length
  const commaCount = separatorMatches.length - dotCount

  if (dotCount > 0 && commaCount > 0) {
    return buildNumberWithRightmostDecimalSeparator(numericValue, isNegative)
  }

  if (separatorMatches.length > 1) {
    return `${isNegative ? '-' : ''}${numericValue.replace(/[.,]/g, '')}`
  }

  const separatorIndex = numericValue.search(/[.,]/)
  const fractionDigits = numericValue.length - separatorIndex - 1
  if (
    options.decimalDigits !== undefined &&
    fractionDigits === 3 &&
    separatorIndex > 0
  ) {
    return `${isNegative ? '-' : ''}${numericValue.replace(/[.,]/g, '')}`
  }

  return `${isNegative ? '-' : ''}${numericValue.replace(/[.,]/, '.')}`
}

function buildNumberWithRightmostDecimalSeparator(
  value: string,
  isNegative: boolean,
) {
  const decimalSeparatorIndex = Math.max(
    value.lastIndexOf('.'),
    value.lastIndexOf(','),
  )
  const integerPart = value.slice(0, decimalSeparatorIndex).replace(/[.,]/g, '')
  const fractionPart = value
    .slice(decimalSeparatorIndex + 1)
    .replace(/[.,]/g, '')

  return `${isNegative ? '-' : ''}${integerPart}.${fractionPart}`
}
