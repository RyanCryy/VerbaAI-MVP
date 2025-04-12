import clientPromise from "./mongodb"
import { ObjectId } from "mongodb"

// Transcription types
export interface Transcription {
  _id?: string | ObjectId
  userId: string | ObjectId
  title: string
  content: string
  summary?: string
  audioUrl?: string
  duration: number
  createdAt: Date
  updatedAt: Date
  isPublic: boolean
  tags?: string[]
}

// Transcription functions
export async function createTranscription(transcriptionData: Omit<Transcription, "_id" | "createdAt" | "updatedAt">) {
  const client = await clientPromise
  const collection = client.db().collection("transcriptions")

  const now = new Date()
  const newTranscription = {
    ...transcriptionData,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(newTranscription)
  return { ...newTranscription, _id: result.insertedId }
}

export async function getUserTranscriptions(userId: string | ObjectId) {
  const client = await clientPromise
  const collection = client.db().collection("transcriptions")

  const objectId = typeof userId === "string" ? new ObjectId(userId) : userId

  return collection.find({ userId: objectId }).sort({ createdAt: -1 }).toArray() as Promise<Transcription[]>
}

export async function getTranscriptionById(id: string | ObjectId) {
  const client = await clientPromise
  const collection = client.db().collection("transcriptions")

  const objectId = typeof id === "string" ? new ObjectId(id) : id

  return collection.findOne({ _id: objectId }) as Promise<Transcription | null>
}

export async function updateTranscription(
  id: string | ObjectId,
  updateData: Partial<Omit<Transcription, "_id" | "userId" | "createdAt">>,
) {
  const client = await clientPromise
  const collection = client.db().collection("transcriptions")

  const objectId = typeof id === "string" ? new ObjectId(id) : id

  return collection.updateOne(
    { _id: objectId },
    {
      $set: {
        ...updateData,
        updatedAt: new Date(),
      },
    },
  )
}

export async function deleteTranscription(id: string | ObjectId) {
  const client = await clientPromise
  const collection = client.db().collection("transcriptions")

  const objectId = typeof id === "string" ? new ObjectId(id) : id

  return collection.deleteOne({ _id: objectId })
}
