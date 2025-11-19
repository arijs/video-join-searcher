
export type Writable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U>
    ? Writable<U>[]
    : T[P] extends object
    ? Writable<T[P]>
    : T[P];
}

export interface VideoFile {
  path: string
  name: string
  size: number          // bytes
  mtime: number         // timestamp ms
  ctime?: number        // opcional (Windows tem, Linux nem sempre)
  duration?: number     // segundos
  width?: number
  height?: number
}

export interface ComparisonResult {
  id: string
  from: VideoFile
  to: VideoFile
  match: number
  resolution: string
  fromThumb: string
  toThumb: string
}