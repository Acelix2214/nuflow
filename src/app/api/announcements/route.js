import { NextResponse } from 'next/server'
import { getMongoClient, getDatabaseConnectionMessage } from '@/lib/mongodb'

export async function GET(request) {
  try {
    let client, db, announcementsCollection
    try {
      client = await getMongoClient()
      db = client.db('nuflow')
      announcementsCollection = db.collection('announcements')
    } catch (dbError) {
      console.error('[NU Flow] Database connection error:', dbError.message)
      return NextResponse.json(
        { success: false, message: getDatabaseConnectionMessage(dbError) },
        { status: 500 }
      )
    }

    const announcements = await announcementsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      data: announcements.map(ann => ({
        ...ann,
        id: ann._id.toString(),
      })),
    })
  } catch (error) {
    console.error('Announcements error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, title, content } = body

    let client, db, announcementsCollection
    try {
      client = await getMongoClient()
      db = client.db('nuflow')
      announcementsCollection = db.collection('announcements')
    } catch (dbError) {
      console.error('[NU Flow] Database connection error:', dbError.message)
      return NextResponse.json(
        { success: false, message: getDatabaseConnectionMessage(dbError) },
        { status: 500 }
      )
    }

    const sessionCookie = request.cookies.get('session_user')
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = JSON.parse(sessionCookie.value)

    if (action === 'create') {
      const result = await announcementsCollection.insertOne({
        title,
        content,
        createdBy: user.id,
        createdByUsername: user.username,
        status: user.role === 'SDAO Office' ? 'approved' : 'pending',
        createdAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: 'Announcement created',
        announcementId: result.insertedId.toString(),
      })
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Announcements error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
