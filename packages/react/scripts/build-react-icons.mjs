#!/usr/bin/env node

import * as fs from 'fs/promises'
import * as path from 'path'

import { transform } from '@svgr/core'
import _ from 'lodash-es'
import chalk from 'chalk'
import * as prettier from 'prettier'

import { fNumber, fPercentage, sleep } from '@exposed-icons/utils'

import db from './icons-db.mjs'
import numberToEnglish from './number-to-english.mjs'
import prettierConfig from '../../../.prettierrc.js'

const { icons: _icons, types, styles } = db

const icons = _icons //.filter(({ name }) => name === 'Add User')

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
      plugins: ['@svgr/plugin-jsx'],
      icon: true,
      typescript: true,
      ref: true,
      replaceAttrValues: {
        '#000': 'currentColor',
        '#000000': 'currentColor',
        black: 'currentColor',
      },
    },
    { componentName: `${iconName}Icon` },
  )

  // Remove react import
  tsxFileContent = tsxFileContent.replace(`import * as React from 'react'`, '')
  // Remove title
  tsxFileContent = tsxFileContent.replace(/<title>.*<\/title>/g, '')
  tsxFileContent = tsxFileContent.replace(/Iconly/g, 'ExposedIcon')
  // Add displayName
  // tsxFileContent += `ForwardRef.displayName = '${iconName}'\n\n`
  tsxFileContent = tsxFileContent.replace(/ForwardRef/g, iconName)

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

  let generatedIcons = []

  for (const icon of iconsToGen) {
    generatedIcons.push(await buildIcon(icon))
  }

  generatedIcons = _.uniqBy(
    generatedIcons,
    ({ componentName }) => componentName,
  )

  // Write index.ts and dynamicIconImports.ts
  const indexFilePath = path.join(ICONS_DIR, 'index.ts')
  const dynamicIconImportsFilePath = path.join(
    __dirname,
    '../src/dynamicIconImports.ts',
  )

  let dynamicIconImports = 'const dynamicIconImports = {\n'

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

    dynamicIconImports += `  ${componentName}: () => import('./icons/${_.kebabCase(
      getIconName(`${name} ${type} ${style}`),
    )}'),\n`
  }

  // Write dynamicIconImports.ts
  dynamicIconImports += '}\n\n'
  dynamicIconImports += 'export default dynamicIconImports\n'

  await fs.writeFile(dynamicIconImportsFilePath, dynamicIconImports)
}

async function main() {
  await buildReactIcons()
}

try {
  main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
