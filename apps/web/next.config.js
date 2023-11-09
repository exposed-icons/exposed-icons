const million = require('million/compiler')
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@exposed-icons/react'],
}

module.exports = million.next(nextConfig, { auto: { rsc: true } })
