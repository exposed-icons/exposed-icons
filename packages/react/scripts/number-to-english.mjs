function numberToEnglish(n) {
  if (n < 0) return false
  const SINGLE_DIGIT = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ]
  const DOUBLE_DIGIT = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const BELOW_HUNDRED = [
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ]
  if (n === 0) return 'Zero'
  function translate(n) {
    let word = ''
    if (n < 10) {
      word = SINGLE_DIGIT[n] + ' '
    } else if (n < 20) {
      word = DOUBLE_DIGIT[n - 10] + ' '
    } else if (n < 100) {
      const rem = translate(n % 10)
      word = BELOW_HUNDRED[(n - (n % 10)) / 10 - 2] + ' ' + rem
    } else if (n < 1000) {
      word =
        SINGLE_DIGIT[Math.trunc(n / 100)] + ' Hundred ' + translate(n % 100)
    } else if (n < 1000000) {
      word =
        translate(parseInt(n / 1000)).trim() +
        ' Thousand ' +
        translate(n % 1000)
    } else if (n < 1000000000) {
      word =
        translate(parseInt(n / 1000000)).trim() +
        ' Million ' +
        translate(n % 1000000)
    } else {
      word =
        translate(parseInt(n / 1000000000)).trim() +
        ' Billion ' +
        translate(n % 1000000000)
    }
    return word
  }
  const result = translate(n)
  return result.trim()
}

export default numberToEnglish
