import { NextResponse } from 'next/server'
import { getMongoClient, getDatabaseConnectionMessage } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request) {
  try {
    let client, db, eventsCollection
    try {
      client = await getMongoClient()
      db = client.db('nuflow')
      eventsCollection = db.collection('events')
    } catch (dbError) {
      console.error('[NU Flow] Database connection error:', dbError.message)
      return NextResponse.json(
        { success: false, message: getDatabaseConnectionMessage(dbError) },
        { status: 500 }
      )
    }

    const events = await eventsCollection.find({}).toArray()

    return NextResponse.json({
      success: true,
      data: events.map(event => ({
        ...event,
        id: event._id.toString(),
      })),
    })
  } catch (error) {
    console.error('Events error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, title, description, date, time, location, facilityId } = body

    let client, db, eventsCollection
    try {
      client = await getMongoClient()
      db = client.db('nuflow')
      eventsCollection = db.collection('events')
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
      const result = await eventsCollection.insertOne({
        title,
        description,
        date,
        time,
        location,
        facilityId,
        createdBy: user.id,
        createdByUsername: user.username,
        status: user.role === 'SDAO Office' ? 'approved' : 'pending',
        createdAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: 'Event created',
        eventId: result.insertedId.toString(),
      })
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Events error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
