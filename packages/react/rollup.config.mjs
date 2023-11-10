import plugins, { replace } from './base-rollup-plugins.mjs'
import pkg from './package.json' assert { type: 'json' }
import dts from 'rollup-plugin-dts'
// import getAliasesEntryNames from './scripts/getAliasesEntryNames.mjs'

// const aliasesEntries = await getAliasesEntryNames()

const packageName = 'ExposedIconsReact'
const outputFileName = 'index'
const outputDir = `dist`
const inputs = [`src/index.ts`]
const bundles = [
  {
    format: 'umd',
    inputs,
    outputDir,
    minify: true,
  },
  {
    format: 'umd',
    inputs,
    outputDir,
  },
  {
    format: 'cjs',
    inputs,
    outputDir,
    aliasesSupport: true,
  },
  {
    format: 'esm',
    inputs: [
      ...inputs,
      // ...aliasesEntries
    ],
    outputDir,
    preserveModules: true,
    aliasesSupport: true,
  },
  {
    format: 'esm',
    inputs: ['src/icons/dynamic/index.ts'],
    outputFile: 'dynamic.js',
    aliasesSupport: true,
    external: [/src/],
    paths: (id) => {
      if (id.match(/src/)) {
        const [, modulePath] = id.match(/src\/(.*)\.ts/)

        return `dist/esm/${modulePath}.js`
      }
    },
  },
]

const configs = bundles
  .map(
    ({
      inputs,
      outputDir,
      outputFile,
      format,
      minify,
      preserveModules,
      aliasesSupport,
      entryFileNames,
      external = [],
      paths,
    }) =>
      inputs.map((input) => ({
        input,
        plugins: [
          // ...(!aliasesSupport
          //   ? [
          //       replace({
          //         "export * from './aliases';": '',
          //         "export * as icons from './icons';": '',
          //         delimiters: ['', ''],
          //         preventAssignment: false,
          //       }),
          //     ]
          //   : []),
          ...plugins(pkg, minify),
        ],
        external: ['react', 'prop-types', ...external],
        output: {
          name: packageName,
          ...(preserveModules
            ? {
                dir: `${outputDir}/${format}`,
              }
            : {
                file:
                  outputFile ??
                  `${outputDir}/${format}/${outputFileName}${
                    minify ? '.min' : ''
                  }.js`,
              }),
          paths,
          entryFileNames,
          format,
          sourcemap: true,
          preserveModules,
          globals: {
            react: 'react',
            'prop-types': 'PropTypes',
          },
        },
      })),
  )
  .flat()

export default [
  {
    input: 'src/icons/dynamic/index.ts',
    output: [
      {
        file: `dynamic.d.ts`,
        format: 'es',
      },
    ],
    plugins: [dts()],
  },
  {
    input: inputs[0],
    output: [
      {
        file: `dist/${outputFileName}.d.ts`,
        format: 'es',
      },
    ],
    plugins: [dts()],
  },
  ...configs,
]
