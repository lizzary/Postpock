export function readLocalFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    const unreadable = () => reject(reader.error ?? new Error('File read failed'))
    reader.onerror = unreadable
    reader.onabort = unreadable
    reader.readAsDataURL(file)
  })
}
