#!/usr/bin/env node

import * as fs from 'fs/promises'
import * as path from 'path'

import chalk from 'chalk'
import logUpdate from 'log-update'
import * as svgo from 'svgo'

import { fNumber, fPercentage } from '@exposed-icons/utils'

import db from './icons-db.mjs'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const ICON_DIR = path.join(__dirname, '../../../icons')

const cl = console.log

function getSvgFileName(iconName, type, style) {
  const combinedName = `${iconName}_${type}_${style}`

  // split the string by spaces
  let nameParts = combinedName.split(' ')

  // join parts back together, using underscore as separator and convert all to lowercase
  let result = nameParts.join('_').toLowerCase().replace(/-/g, '_')

  return result
}

async function generateSvg({ name, svg, type_id, style_id }) {
  const { types, styles } = db
  const type = types.find((type) => type.id === type_id).name
  const style = styles.find((style) => style.id === style_id).name
  const fileName = getSvgFileName(name, type, style)
  const svgPath = path.join(ICON_DIR, `${fileName}.svg`)
  const optimizedSvg = svgo.optimize(svg, {
    path: svgPath,
    multipass: true,
  }).data

  fs.writeFile(svgPath, optimizedSvg)
}

async function buildSvgIcons() {
  const { icons } = db

  cl(chalk.greenBright('🚀 Building SVG icons...'))
  cl(`🔎 Found ${chalk.yellowBright(fNumber(icons.length))} icons.`)

  // Clean up the icons folder
  await fs.rm(ICON_DIR, { recursive: true, force: true })
  await fs.mkdir(ICON_DIR, { recursive: true })

  cl('🗂️  Verified icons folder', chalk.greenBright(ICON_DIR))

  // Loop through all icons and build SVG files.
  icons.forEach(async (icon, idx) => {
    logUpdate(
      `🔨 Building SVG files... ${chalk.yellowBright(
        `${fPercentage((idx + 1) / icons.length)}`,
      )}`,
    )
    await generateSvg(icon)
  })

  cl(
    chalk.greenBright(
      `✅ Built ${chalk.yellowBright(fNumber(icons.length))} SVG icons!`,
    ),
  )
}

try {
  buildSvgIcons()
} catch (error) {
  console.error(error)
  process.exit(1)
}

export { buildSvgIcons }
