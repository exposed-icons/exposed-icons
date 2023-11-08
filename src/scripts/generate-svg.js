const fs = require('fs')
const path = require('path')

const db = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../exposed_icons.json'), 'utf8'),
)

function ensureSvgDir() {
  const svgDir = path.join(__dirname, '../../icons')

  if (!fs.existsSync(svgDir)) {
    console.log(`Create SVG directory at ${svgDir}`)
    fs.mkdirSync(svgDir)
  }
}

function getSvgFileName(iconName, type, style) {
  const combinedName = `${iconName}_${type}_${style}`

  // split the string by spaces
  let nameParts = combinedName.split(' ')

  // join parts back together, using underscore as separator and convert all to lowercase
  let result = nameParts.join('_').toLowerCase().replace(/-/g, '_')

  return result
}

function generateSvg({ name, svg, type_id, style_id }) {
  const { types, styles } = db
  const type = types.find((type) => type.id === type_id).name
  const style = styles.find((style) => style.id === style_id).name
  const fileName = getSvgFileName(name, type, style)
  const svgPath = path.join(__dirname, `../../icons/${fileName}.svg`)

  fs.writeFileSync(svgPath, svg)
}

function generateSvgByName(iconName) {
  console.log(`Generate SVG for ${iconName}`)

  const { icons, types, styles } = db

  console.log(`Found ${icons.length} icons`)

  const matchedIcons = icons.filter((icon) => icon.name === iconName)

  if (matchedIcons.length === 0) {
    console.log(`No icons matched "${iconName}". Exiting...`)
    return
  }

  console.log(`Found ${matchedIcons.length} matched "${iconName}"`)

  ensureSvgDir()

  matchedIcons.forEach(generateSvg)
}

function generateAllIcons() {
  console.log('Generate SVG for all icons')

  const { icons } = db

  console.log(`Found ${icons.length} icons`)

  ensureSvgDir()

  icons.forEach((icon, idx) => {
    generateSvg(icon)
    console.log(`Generated ${idx + 1}/${icons.length} icons`)
  })
}

generateAllIcons()
