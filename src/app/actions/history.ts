'use server';

import { isMongoConfigured, getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * Saves a generated summary to MongoDB.
 * Only works for logged-in users when MongoDB is configured.
 */
export async function saveSummaryAction(userId: string, videoId: string, metadata: any, summary: any) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const db = await getDatabase();
    const summariesCollection = db.collection('summaries');
    
    const existing = await summariesCollection.findOne({ userId, videoId });
    if (existing) {
      return { success: true, id: existing._id, message: 'Already saved' };
    }
    
    const result = await summariesCollection.insertOne({
      userId,
      videoId,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      channelName: metadata.channelName,
      summary,
      createdAt: new Date(),
    });
    
    return { success: true, id: result.insertedId };
  } catch (error) {
    console.error('Error saving summary:', error);
    return { success: false, error: 'Failed to save summary' };
  }
}

/**
 * Fetches the summary history for a specific user.
 * Only works when MongoDB is configured.
 */
export async function getUserHistoryAction(userId: string) {
  if (!isMongoConfigured()) {
    return [];
  }

  try {
    const db = await getDatabase();
    const summariesCollection = db.collection('summaries');
    
    const summaries = await summariesCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return summaries.map(doc => ({
      id: doc._id.toString(),
      videoId: doc.videoId,
      title: doc.title,
      thumbnail: doc.thumbnail,
      channelName: doc.channelName,
      summary: doc.summary,
      date: doc.createdAt?.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) || 'Just now'
    }));
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
}

/**
 * Deletes a summary from history.
 */
export async function deleteSummaryAction(id: string) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const db = await getDatabase();
    const summariesCollection = db.collection('summaries');
    
    await summariesCollection.deleteOne({ _id: new ObjectId(id) });
    return { success: true };
  } catch (error) {
    console.error('Error deleting summary:', error);
    return { success: false, error: 'Failed to delete summary' };
  }
}
