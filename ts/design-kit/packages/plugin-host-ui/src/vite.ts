import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as viteApi from 'vite'
import { build, type Plugin, type ResolvedConfig, type Rollup } from 'vite'
import { fileURLToPath } from 'node:url'
import { sha256Bytes, base64Bytes } from './isolation/bytes.js'
import type { BridgeArtifact, BridgeImport } from './isolation/protocol.js'

export type { StylesheetOwner, StylesheetLeases } from './stylesheets.js'

export interface HostEntry {
  /** Exact bare specifier expected by plugin bundles. */
  specifier: string
  /** Host-installed module or absolute/host-root-relative source file. */
  source: string
  /** Explicit named re-exports avoid CJS/ESM namespace ambiguity. */
  exports: readonly string[]
  defaultExport?: boolean
}

/** Caller normalizes the reviewed wire requirements; this is not a wire schema. */
export interface VersionAdmission<Requirements> {
  versions: Readonly<Record<string, string>>
  check(requirements: Requirements, versions: Readonly<Record<string, string>>):
    { accepted: true } | { accepted: false; reason: string }
}

export function admitPluginVersions<T>(admission: VersionAdmission<T>, requirements: T) {
  return admission.check(requirements, admission.versions)
}

/** Build entries for any host's component namespace; no Nanite prefix. */
export function designKitEntries(prefix: string, components: Readonly<Record<string, Omit<HostEntry, 'specifier'>>>): HostEntry[] {
  if (!prefix || prefix.endsWith('/')) throw new Error('Specifier prefix must be nonempty without a trailing slash')
  return Object.entries(components).map(([name, entry]) => ({ ...entry, specifier: `${prefix}/${name}` }))
}

export interface PluginHostImportmapOptions { entries: readonly HostEntry[] }
const namespace = 'plugin-host-ui:entry:'
const styles = 'virtual:plugin-host-ui/stylesheets'

export function pluginHostImportmap(options: PluginHostImportmapOptions): Plugin {
  const entries = options.entries.map(entry => ({ ...entry, exports: [...entry.exports] }))
  const specifiers = new Set<string>()
  for (const entry of entries) {
    if (!entry.specifier || /[\s<>]/u.test(entry.specifier) || entry.specifier.startsWith('.') || entry.specifier.startsWith('/') || entry.specifier.includes(':')) {
      throw new Error(`Invalid bare specifier: ${entry.specifier}`)
    }
    if (specifiers.has(entry.specifier)) throw new Error(`Duplicate host specifier: ${entry.specifier}`)
    specifiers.add(entry.specifier)
    if (!entry.source || (!entry.exports.length && !entry.defaultExport)) throw new Error(`Missing source or exports for ${entry.specifier}`)
    if (new Set(entry.exports).size !== entry.exports.length || entry.exports.some(name => !/^[A-Za-z_$][\w$]*$/u.test(name) || name === 'default')) {
      throw new Error(`Invalid or duplicate named exports for ${entry.specifier}`)
    }
  }
  let config: ResolvedConfig
  const inputName = (index: number) => `plugin-host-ui-${index}`
  const virtualId = (index: number) => `${namespace}${index}`
  const sourceFor = (source: string) => source.startsWith('.') ? resolve(config.root, source) : source
  return {
    name: 'plugin-host-ui-importmap',
    enforce: 'post',
    config(userConfig) {
      const root = resolve(userConfig.root ?? process.cwd())
      const original = userConfig.build?.rollupOptions?.input ?? resolve(root, 'index.html')
      const inputs = typeof original === 'string' ? { main: original }
        : Array.isArray(original) ? Object.fromEntries(original.map((path, i) => [`host-${i}`, path])) : original
      for (let i = 0; i < entries.length; i++) {
        if (inputName(i) in inputs) throw new Error(`Host entry input collision: ${inputName(i)}`)
      }
      return { build: { rollupOptions: {
        input: { ...inputs, ...Object.fromEntries(entries.map((_, i) => [inputName(i), virtualId(i)])) },
        preserveEntrySignatures: 'strict',
      } } }
    },
    configResolved(resolved) { config = resolved },
    resolveId(id) {
      if (id === styles) return `\0${styles}`
      if (id.startsWith(namespace)) return `\0${id}`
    },
    load(id) {
      if (id === `\0${styles}`) {
        return readFileSync(new URL('./stylesheets.js', import.meta.url), 'utf8')
      }
      if (!id.startsWith(`\0${namespace}`)) return
      const entry = entries[Number(id.slice(namespace.length + 1))]
      if (!entry) throw new Error(`Unknown host entry: ${id}`)
      const source = JSON.stringify(sourceFor(entry.source))
      return [
        entry.exports.length ? `export { ${entry.exports.join(', ')} } from ${source};` : '',
        entry.defaultExport ? `export { default } from ${source};` : '',
      ].join('\n')
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const imports: Record<string, string> = Object.create(null)
        entries.forEach((entry, index) => {
          if (!context.bundle) {
            imports[entry.specifier] = `${config.base}@id/__x00__${virtualId(index)}`
            return
          }
          const chunk = Object.values(context.bundle).find(chunk => chunk.type === 'chunk' && chunk.isEntry && chunk.name === inputName(index))
          if (!chunk || chunk.type !== 'chunk') throw new Error(`Missing emitted host entry for ${entry.specifier}`)
          const expected = [...entry.exports, ...(entry.defaultExport ? ['default'] : [])]
          if (expected.some(name => !chunk.exports.includes(name))) throw new Error(`Missing emitted export for ${entry.specifier}`)
          imports[entry.specifier] = `${config.base}${chunk.fileName}`
        })
        // Escape HTML delimiters in a script raw-text element.
        const children = JSON.stringify({ imports }).replaceAll('<', '\\u003c')
        return [{ tag: 'script', attrs: { type: 'importmap' }, children, injectTo: 'head-prepend' }]
      },
    },
  }
}

export interface FrameArtifactBuildOptions { entries: readonly HostEntry[]; root?: string }
/** Each output is a standalone ESM artifact; only reviewed bare peers stay external. */
export async function buildFrameArtifacts(options: FrameArtifactBuildOptions): Promise<{ artifacts: readonly BridgeArtifact[]; imports: readonly BridgeImport[] }> {
  const { reviewFrameModule } = await import('./isolation/graph.js')
  const names = options.entries.map(entry => entry.specifier)
  // Reuse the host entry validator; this does not build or install anything.
  pluginHostImportmap({ entries: options.entries })
  const artifacts: BridgeArtifact[] = [], imports: BridgeImport[] = []
  // Vite 8/Rolldown preserves external CommonJS require by default. Its native
  // bridge owns these externals and emits ESM imports before bytes are pinned.
  const esmExternalRequire = (viteApi as unknown as { esmExternalRequirePlugin?: (options: { external: string[] }) => Plugin }).esmExternalRequirePlugin
  for (const [index, entry] of options.entries.entries()) {
    const virtual = resolve(options.root ?? process.cwd(), '.plugin-frame-entry.js'), id = `runtime-${index}`
    const output = await build({ root: options.root, configFile: false, logLevel: 'silent', plugins: [...(esmExternalRequire ? [esmExternalRequire({ external: names.filter(name => name !== entry.specifier) })] : []), {
      name: 'plugin-frame-entry', resolveId: source => source === virtual ? `\0${virtual}` : undefined,
      load: source => source === `\0${virtual}` ? [entry.exports.length ? `export { ${entry.exports.join(', ')} } from ${JSON.stringify(entry.source)};` : '', entry.defaultExport ? `export { default } from ${JSON.stringify(entry.source)};` : ''].join('\n') : undefined,
    }], build: { write: false, minify: true, target: 'es2022', lib: { entry: virtual, formats: ['es'] },
      rollupOptions: { external: esmExternalRequire ? undefined : source => source !== entry.specifier && names.includes(source), output: { inlineDynamicImports: true } } }, define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    }) as Rollup.RollupOutput | Rollup.RollupOutput[]
    const bundle = Array.isArray(output) ? output[0] : output
    const chunks = bundle.output.filter((item): item is Rollup.OutputChunk => item.type === 'chunk')
    if (chunks.length !== 1 || !chunks[0].isEntry || chunks[0].imports.some(name => !names.includes(name)) || chunks[0].dynamicImports.some(name => !names.includes(name))) throw new Error('unsupported-variant')
    const module = new TextEncoder().encode(chunks[0].code)
    await reviewFrameModule(module, names)
    artifacts.push(Object.freeze({ id, kind: 'module', sha256: await sha256Bytes(module), base64: base64Bytes(module) }))
    imports.push(Object.freeze({ specifier: entry.specifier, artifact: id }))
    for (const asset of bundle.output) {
      if (asset.type !== 'asset') continue
      if (!asset.fileName.endsWith('.css')) throw new Error('unsupported-variant')
      const css = typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source)
      if (/@import\b/iu.test(css) || [...css.matchAll(/url\(\s*['"]?([^)'"\s]+)/giu)].some(match => !match[1].startsWith('data:'))) throw new Error('unsupported-variant')
      const bytes = new TextEncoder().encode(css)
      artifacts.push(Object.freeze({ id: `${id}-style`, kind: 'style', sha256: await sha256Bytes(bytes), base64: base64Bytes(bytes) }))
    }
  }
  return Object.freeze({ artifacts: Object.freeze(artifacts), imports: Object.freeze(imports) })
}
/** Fixed host bootstrap artifact. CSP hashes these exact emitted bytes. */
export async function buildFrameBootstrap(): Promise<string> {
  const output = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: true, target: 'es2022',
    lib: { entry: fileURLToPath(new URL('./isolation/bootstrap-entry.js', import.meta.url)), name: 'PluginFrameBootstrap', formats: ['iife'] },
    rollupOptions: { output: { inlineDynamicImports: true } },
  } }) as Rollup.RollupOutput | Rollup.RollupOutput[]
  const bundle = Array.isArray(output) ? output[0] : output
  const chunks = bundle.output.filter((item): item is Rollup.OutputChunk => item.type === 'chunk')
  if (chunks.length !== 1 || chunks[0].imports.length || chunks[0].dynamicImports.length) throw new Error('unsupported-variant')
  return chunks[0].code
}
