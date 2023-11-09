import {
  forwardRef,
  createElement,
  ReactSVG,
  SVGProps,
  ForwardRefExoticComponent,
  RefAttributes,
} from 'react'

import defaultAttributes from './default-attributes'

type IconVariant =
  | 'light'
  | 'light-outline'
  | 'bold'
  | 'broken'
  | 'bulk'
  | 'two-tone'

type Shape = 'regular' | 'sharp' | 'curved'

export type IconNode = [
  elementName: keyof ReactSVG,
  attrs: Record<string, string>,
][]

export type SVGAttributes = Partial<SVGProps<SVGSVGElement>>
type ComponentAttributes = RefAttributes<SVGSVGElement> & SVGAttributes

export interface ExposedIconProps extends ComponentAttributes {
  size?: string | number
  absoluteStrokeWidth?: boolean
  variant?: IconVariant
  shape?: Shape
}

export type ExposedIcon = ForwardRefExoticComponent<ExposedIconProps>

/**
 * Converts string to KebabCase
 */
export const toKebabCase = (string: string) =>
  string.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const createExposedIcon = (
  iconName: string,
  iconNode: IconNode,
): ExposedIcon => {
  const Component = forwardRef<SVGSVGElement, ExposedIconProps>(
    (
      {
        color = 'currentColor',
        size = 24,
        strokeWidth = 1.5,
        absoluteStrokeWidth,
        children,
        ...rest
      },
      ref,
    ) =>
      createElement(
        'svg',
        {
          ref,
          ...defaultAttributes,
          width: size,
          height: size,
          stroke: color,
          strokeWidth: absoluteStrokeWidth
            ? (Number(strokeWidth) * 24) / Number(size)
            : strokeWidth,
          className: `exposed-icon exposed-icon-${toKebabCase(iconName)}`,
          ...rest,
        },
        [
          ...iconNode.map(([tag, attrs]) => createElement(tag, attrs)),
          ...((Array.isArray(children) ? children : [children]) || []),
        ],
      ),
  )

  Component.displayName = `Exposed${iconName}`

  return Component
}

export default createExposedIcon
