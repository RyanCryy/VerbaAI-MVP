"use server"

import { revalidatePath } from "next/cache"
import {
  createTranscription as dbCreateTranscription,
  updateTranscription as dbUpdateTranscription,
  deleteTranscription as dbDeleteTranscription,
  type Transcription,
} from "./db"

// Default user ID for demo purposes
const DEMO_USER_ID = "demo-user-id"

export async function createTranscription(transcriptionData: Omit<Transcription, "_id" | "createdAt" | "updatedAt">) {
  try {
    // Create the transcription
    const result = await dbCreateTranscription(transcriptionData)

    // Revalidate the dashboard page
    revalidatePath("/")

    return result
  } catch (error: any) {
    console.error("Error creating transcription:", error)
    throw new Error(error.message || "Failed to create transcription")
  }
}

export async function updateTranscription(
  id: string,
  updateData: Partial<Omit<Transcription, "_id" | "userId" | "createdAt">>,
) {
  try {
    // Update the transcription
    const result = await dbUpdateTranscription(id, updateData)

    // Revalidate the transcription page
    revalidatePath(`/transcriptions/${id}`)
    revalidatePath("/")

    return result
  } catch (error: any) {
    console.error("Error updating transcription:", error)
    throw new Error(error.message || "Failed to update transcription")
  }
}

export async function deleteTranscription(id: string) {
  try {
    // Delete the transcription
    const result = await dbDeleteTranscription(id)

    // Revalidate the dashboard page
    revalidatePath("/")

    return result
  } catch (error: any) {
    console.error("Error deleting transcription:", error)
    throw new Error(error.message || "Failed to delete transcription")
  }
}
