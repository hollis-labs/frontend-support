// Root workspace order visits kit-admin before its kit dependencies.
import { execFileSync } from 'node:child_process'
for (const name of ['kit-dashboard', 'kit-settings', 'kit-observe']) {
  execFileSync('npm', ['run', 'build', '--workspace=@hollis-labs/' + name], { stdio: 'inherit' })
}
