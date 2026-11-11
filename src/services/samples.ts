import pb from '@/lib/pocketbase/client'

export interface SampleUpdateData {
  name?: string
  variety?: string
  price?: number
  weight?: number
}

export const getSamples = () => pb.collection('samples').getFullList({ sort: '-created' })

export const getSample = (id: string) => pb.collection('samples').getOne(id)

export const pollSampleStatus = async (
  id: string,
  onUpdate: (record: any) => void,
  options?: { intervalMs?: number; maxAttempts?: number },
): Promise<void> => {
  const intervalMs = options?.intervalMs ?? 3000
  const maxAttempts = options?.maxAttempts ?? 40

  return new Promise((resolve) => {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const record = await pb.collection('samples').getOne(id)
        onUpdate(record)
        if (record.status === 'completed' || record.status === 'error') {
          clearInterval(interval)
          resolve()
        }
      } catch {
        // ignore fetch errors during polling
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        resolve()
      }
    }, intervalMs)
  })
}

export const updateSample = (id: string, data: SampleUpdateData) =>
  pb.collection('samples').update(id, data)

export const deleteSample = (id: string) => pb.collection('samples').delete(id)
