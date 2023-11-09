#!/usr/bin/env node

import * as fs from 'fs/promises'
import * as path from 'path'

import { transform } from '@svgr/core'
import _ from 'lodash-es'
import chalk from 'chalk'
import logUpdate from 'log-update'
import * as svgson from 'svgson'
import * as prettier from 'prettier'

import { fNumber, fPercentage, sleep } from '@exposed-icons/utils'

import db from './icons-db.mjs'
import numberToEnglish from './number-to-english.mjs'
import prettierConfig from '../../../.prettierrc.js'

const { icons: _icons, types, styles } = db

const icons = _icons //.filter(({ name }) => name === 'Add User')

const CI = process.env.CI === 'true'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const ICONS_DIR = path.resolve(__dirname, '../src/icons')

const cl = console.log

function getIconName(name) {
  let iconName = name.toLowerCase()
  // replace all dashes with spaces
  iconName = iconName.replace(/-/g, ' ')
  // replace . with Dot
  iconName = iconName.replace(/\./g, ' Dot ')
  // replace , with Comma
  iconName = iconName.replace(/,/g, ' Comma ')
  // replace & with And
  iconName = iconName.replace(/&/g, ' And ')
  // uppercase the first character of each word
  iconName = iconName.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())
  // replace leading numbers with words
  iconName = iconName.replace(/^\d+/, (m) => numberToEnglish(parseInt(m)))
  // remove spaces
  iconName = iconName.replace(/\s/g, '')

  return iconName
}

async function buildIcon({ name, svg, type_id, style_id }) {
  const type = types.find((type) => type.id === type_id).name.toLowerCase()
  const style = styles.find((style) => style.id === style_id).name.toLowerCase()
  const iconName = getIconName(`${name} ${type} ${style}`)

  let tsxFileContent = await transform(
    svg,
    {
      plugins: [
        '@svgr/plugin-jsx',
        // '@svgr/plugin-prettier'
      ],
      icon: true,
      typescript: true,
      ref: true,
      replaceAttrValues: {
        '#000': 'currentColor',
        '#000000': 'currentColor',
        black: 'currentColor',
      },
      // prettierConfig: {
      //   parser: 'typescript',
      //   ...prettierConfig,
      // },
    },
    { componentName: iconName },
  )

  // Remove react import
  tsxFileContent = tsxFileContent.replace(`import * as React from 'react'`, '')
  // Remove title
  tsxFileContent = tsxFileContent.replace(/<title>.*<\/title>/g, '')
  tsxFileContent = tsxFileContent.replace(/Iconly/g, 'ExposedIcon')

  tsxFileContent = await prettier.format(tsxFileContent, {
    parser: 'typescript',
    ...prettierConfig,
  })

  // Write icon to file
  const fileName = _.kebabCase(iconName)
  const filePath = path.join(ICONS_DIR, `${fileName}.tsx`)

  await fs.writeFile(filePath, tsxFileContent)

  return { name, componentName: iconName, type, style }
}

async function buildReactIcons() {
  cl(
    chalk.greenBright(
      `🚀 Building ${chalk.yellowBright('@exposed-icons/react')}...`,
    ),
  )
  cl(`🔎 Found ${chalk.yellowBright(fNumber(icons.length))} icons.`)

  let iconsToGen = _.take(icons, Infinity)

  cl(
    `🔨 Building ${chalk.yellowBright(
      fNumber(iconsToGen.length),
    )} React icons...`,
  )

  let started = Date.now()

  let generatedIcons = []

  for (const icon of iconsToGen) {
    generatedIcons.push(await buildIcon(icon))
  }

  generatedIcons = _.uniqBy(
    generatedIcons,
    ({ componentName }) => componentName,
  )

  // Write index.ts
  const indexFilePath = path.join(ICONS_DIR, 'index.ts')
  for (const { name, componentName, style, type } of generatedIcons) {
    const fileName = _.kebabCase(getIconName(`${name} ${type} ${style}`))
    const exportStatement = `export { default as ${componentName} } from './${fileName}'\n`
    try {
      await fs.appendFile(indexFilePath, exportStatement)
    } catch (error) {
      // Create index file if not exists
      await fs.writeFile(indexFilePath, exportStatement)
      continue
    }
  }

  cl(
    chalk.greenBright(
      `🎉 Successfully built React icons in ${chalk.yellowBright(
        Math.floor((Date.now() - started) / 1000),
      )}s`,
    ),
  )
}

async function findIconFileByStyleAndType(
  iconName,
  style,
  type,
  extension = 'tsx',
) {
  const iconPath = path.join(
    ICONS_DIR,
    type,
    style,
    `${_.kebabCase(iconName)}.${extension}`,
  )
  try {
    await fs.access(iconPath)
    return iconPath
  } catch (error) {
    return null
  }
}

async function buildBaseIconWithProps({ iconName }) {
  /**
   * @type {['regular' | 'sharp' | 'curved', 'light' | 'light-outline' | 'bold' | 'broken' | 'bulk' | 'two-tone'][]}
   */
  let typeStyleMatrix = []
  for (const type of types) {
    for (const style of styles) {
      typeStyleMatrix.push([type.name.toLowerCase(), style.name.toLowerCase()])
    }
  }

  const fileName = _.kebabCase(iconName)
  const filePath = path.join(ICONS_DIR, 'all', `${fileName}.tsx`)

  let tsxImports = ``
  let tsxBody = ``

  let variantShapes = []

  for (const [type, style] of typeStyleMatrix) {
    const iconPath = await findIconFileByStyleAndType(iconName, style, type)
    if (!iconPath) continue

    const importName = getIconName(`${iconName} ${type} ${style}`)

    tsxImports += `import ${importName} from '../${type}/${style}/${fileName}'\n`

    variantShapes.push([style, type])

    tsxBody += `
      if (variant === '${style}' && shape === '${type}') {
        return <${importName} {...props} />
      }
    `
  }

  const defaultVariant = variantShapes[0][0]
  const defaultShape = variantShapes[0][1]

  // console.log(tsxImports, variants)

  let tsxFileContent = `
    import { ExposedIconProps } from '../../create-exposed-icon'

    ${tsxImports}

    type VariantShape = ${variantShapes
      .map((vs) => `{ variant: '${vs[0]}', shape: '${vs[1]}' }`)
      .join(' | ')}

    export type ${iconName}IconProps = Omit<ExposedIconProps, 'variant' | 'shape'> & VariantShape

    const ${iconName} = ({ variant = '${defaultVariant}', shape = '${defaultShape}', ...props }: ${iconName}IconProps) => {
      ${tsxBody}
      return null
    }

    export default ${iconName}
  `

  console.log(tsxFileContent)

  tsxFileContent = await prettier.format(tsxFileContent, {
    parser: 'typescript',
    ...prettierConfig,
  })

  // Write icon to file
  await fs.writeFile(filePath, tsxFileContent)

  // Append icon to index.ts
  const indexFilePath = path.join(ICONS_DIR, 'all', 'index.ts')
  let indexFileContent = ''
  try {
    indexFileContent = await fs.readFile(indexFilePath, 'utf-8')
  } catch (error) {}

  if (!indexFileContent.includes(iconName)) {
    let newFileContent = `${indexFileContent}export { default as ${iconName} } from './${fileName}'`
    newFileContent = await prettier.format(newFileContent, {
      parser: 'babel',
      ...prettierConfig,
    })
    await fs.writeFile(indexFilePath, newFileContent)
  }

  return tsxFileContent
}

async function buildBaseIconsWithProps() {
  cl(chalk.greenBright(`🚀 Building base react icons with props`))

  let iconNames = _.take(icons, Infinity)
  iconNames = iconNames.map(({ name }) => getIconName(name))
  iconNames = _.uniq(iconNames)

  cl(
    `🔎 Found ${chalk.yellowBright(
      iconNames.length,
    )} unique names over ${chalk.yellowBright(icons.length)} icons`,
  )

  const iconsDir = path.join(ICONS_DIR, 'all')
  await fs.mkdir(iconsDir, { recursive: true })

  let typeStyleMatrix = []
  for (const type of types) {
    for (const style of styles) {
      typeStyleMatrix.push([type.name.toLowerCase(), style.name.toLowerCase()])
    }
  }

  const now = Date.now()
  let built = 0
  let failed = 0

  for (const iconName of iconNames) {
    try {
      await buildBaseIconWithProps({ iconName })
    } catch (error) {
      cl(`⚠️ Failed to build ${chalk.redBright(iconName)}`)
      failed++
      console.error(error)
    }

    !CI &&
      logUpdate(
        `   💔 ${chalk.redBright(fNumber(failed))}\n   ✅ ${chalk.greenBright(
          fNumber(++built),
        )}\n   🧭 ${Math.floor(
          (Date.now() - now) / 1000,
        )}s ${chalk.yellowBright(`${fPercentage(built / iconNames.length)}`)}`,
      )
  }
}

async function main() {
  await buildReactIcons()
  // await buildBaseIconsWithProps()
}

try {
  main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
