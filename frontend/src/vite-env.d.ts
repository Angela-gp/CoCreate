/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' в сборке для APK / открытия файлом: маршруты через hash. */
  readonly VITE_PACKAGED?: string
  /** Необязательный собственный RPC; без него используется публичный Solana Devnet. */
  readonly VITE_SOLANA_RPC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface WebMcpTool {
  name: string
  title?: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }
  execute: (input: unknown) => unknown | Promise<unknown>
}

interface Document {
  readonly modelContext?: {
    registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void | Promise<void>
  }
}
