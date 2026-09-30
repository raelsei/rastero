import { describe, expect, test } from 'bun:test'
import { fromFileList } from './ingest'

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** File as produced by <input webkitdirectory>: webkitRelativePath includes the picked folder. */
function folderFile(relativePath: string, content: BlobPart): File {
  const file = new File([content], relativePath.split('/').pop() as string)
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath })
  return file
}

describe('fromFileList', () => {
  test('folder input keeps the relative tree; type comes from bytes, not the extension', async () => {
    const result = await fromFileList([
      folderFile('shots/a/photo.JPG', JPEG),
      folderFile('shots/b/mislabelled.jpg', PNG),
    ])
    expect(result.files.map((f) => [f.relativePath, f.sourceType])).toEqual([
      ['shots/a/photo.JPG', 'jpeg'],
      ['shots/b/mislabelled.jpg', 'png'],
    ])
    expect(result.skipped).toEqual([])
  })

  test('plain file input falls back to the file name', async () => {
    const result = await fromFileList([new File([JPEG], 'single.jpg')])
    expect(result.files[0].relativePath).toBe('single.jpg')
  })

  test('non-images are skipped by path; dotfiles and hidden folders vanish silently', async () => {
    const result = await fromFileList([
      folderFile('shots/notes.txt', 'hello'),
      folderFile('shots/.DS_Store', JPEG),
      folderFile('shots/.thumbs/cached.jpg', JPEG),
      folderFile('shots/ok.jpg', JPEG),
    ])
    expect(result.files.map((f) => f.relativePath)).toEqual(['shots/ok.jpg'])
    expect(result.skipped).toEqual(['shots/notes.txt'])
  })
})
