export function fNumber(number) {
  return number.toLocaleString('en-US')
}

export function fPercentage(number, decimals = 2) {
  return `${(number * 100).toFixed(decimals)}%`
}
