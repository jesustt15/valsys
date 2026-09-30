// Convert a Node Readable (MinIO client stream) into a Web ReadableStream
// so it can be returned directly from a Route Handler as a NextResponse body.
//
// Shared by the attachment and signature streaming routes — keep it free of
// framework/auth imports so it stays trivially testable.

export function readableNodeToWeb(nodeStream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      nodeStream.on('end', () => {
        controller.close()
      })
      nodeStream.on('error', (err: Error) => {
        controller.error(err)
      })
    },
    cancel() {
      if ('destroy' in nodeStream && typeof nodeStream.destroy === 'function') {
        nodeStream.destroy()
      }
    },
  })
}
