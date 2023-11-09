#!/usr/bin/env node

import * as fs from 'fs/promises'
import * as path from 'path'

import _ from 'lodash-es'
import chalk from 'chalk'
import logUpdate from 'log-update'
import * as svgson from 'svgson'
import * as prettier from 'prettier'

import { fNumber, fPercentage, sleep } from '@exposed-icons/utils'

import db from './icons-db.mjs'
import numberToEnglish from './number-to-english.mjs'
import prettierConfig from '../../../.prettierrc.js'

const { icons, types, styles } = db

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const ICONS_DIR = path.resolve(__dirname, '../src/icons')

const cl = console.log

function getIconName(name) {
  let iconName = name
  // replace all dashes with spaces
  iconName = name.replace(/-/g, ' ')
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
  const iconName = getIconName(name)

  // const logTitle = `⚛️  Building ${chalk.redBright(name)} → ${chalk.greenBright(
  //   iconName,
  // )} (${chalk.yellowBright(type)}, ${chalk.yellowBright(style)})...`

  // logUpdate(logTitle)

  // Verify icon directory
  const typeBasedDir = path.join(ICONS_DIR, type, style)

  await fs.mkdir(typeBasedDir, { recursive: true })

  let tsxFileContent = `
    import createExposedIcon from '../../../create-exposed-icon'

    const ${iconName} = createExposedIcon('${iconName}', ${JSON.stringify(
      svgson
        .parseSync(svg.replace(/Iconly\//g, 'ExposedIcon/'))
        .children.filter(child => !['title'].includes(child.name)).map((child) => [child.name, child.attributes]),
    )})

    export default ${iconName}
  `

  tsxFileContent = await prettier.format(tsxFileContent, {
    parser: 'babel',
    ...prettierConfig,
  })

  // Write icon to file
  const fileName = `${iconName}.tsx`
  const filePath = path.join(typeBasedDir, fileName)

  await fs.writeFile(filePath, tsxFileContent)

  // Append icon to index.ts
  const indexFilePath = path.join(typeBasedDir, 'index.ts')
  let indexFileContent = ''
  try {
    indexFileContent = await fs.readFile(indexFilePath, 'utf-8')
  } catch (error) {}

  if (!indexFileContent.includes(iconName)) {
    let newFileContent = `${indexFileContent}export { default as ${iconName} } from './${iconName}'`
    newFileContent = await prettier.format(newFileContent, {
      parser: 'babel',
      ...prettierConfig,
    })
    await fs.writeFile(indexFilePath, newFileContent)
  }
}

async function buildReactIcons() {
  cl(
    chalk.greenBright(
      `🚀 Building ${chalk.yellowBright('@exposed-icons/react')} icons...`,
    ),
  )
  cl(`🔎 Found ${chalk.yellowBright(fNumber(icons.length))} icons.`)

  let iconsToGen = _.take(icons, Infinity)

  cl(`🔨 Building ${chalk.yellowBright(fNumber(iconsToGen.length))} React icons...`)

  let started = Date.now()
  let built = 0
  let failed = 0
  for (const icon of iconsToGen) {
    try {
      await buildIcon(icon)
    } catch (error) {
      cl(`⚠️ Failed to build ${chalk.redBright(icon.name)}`)
      failed++
    }

    logUpdate(
      `   💔 ${chalk.redBright(fNumber(failed))}\n   ✅ ${chalk.greenBright(
        fNumber(++built),
      )}\n   🧭 ${Math.floor(
        (Date.now() - started) / 1000,
      )}s ${chalk.yellowBright(`${fPercentage((built) / iconsToGen.length)}`)}`,
    )
  }
}

try {
  buildReactIcons()
} catch (error) {
  console.error(error)
  process.exit(1)
}
