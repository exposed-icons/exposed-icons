import { readFile } from 'fs/promises'
const db = JSON.parse(
  await readFile(new URL('./exposed_icons.json', import.meta.url)),
)

export default db
