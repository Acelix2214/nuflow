import { NextResponse } from 'next/server'
import { getMongoClient, getDatabaseConnectionMessage } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getSessionUser, isSdao, isStudentOrganization } from '@/lib/auth'

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

    const user = await getSessionUser(request)
    const query = isSdao(user)
      ? {}
      : user
        ? { $or: [{ status: 'approved' }, { createdBy: user.id }] }
        : { status: 'approved' }

    const events = await eventsCollection
      .find(query)
      .sort({ date: 1, time: 1, createdAt: -1 })
      .toArray()

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
    const { action, title, description, date, time, endTime, location, facilityId, id, reason } = body

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

    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (action === 'create') {
      if (!isSdao(user) && !isStudentOrganization(user)) {
        return NextResponse.json(
          { success: false, message: 'Only SDAO and student organizations can create event requests' },
          { status: 403 }
        )
      }

      const result = await eventsCollection.insertOne({
        title,
        description,
        date,
        time,
        endTime,
        end_time: endTime,
        location,
        facilityId,
        createdBy: user.id,
        createdByUsername: user.username,
        status: isSdao(user) ? 'approved' : 'pending',
        createdAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: 'Event created',
        eventId: result.insertedId.toString(),
      })
    }

    if (action === 'approve' || action === 'reject') {
      if (!isSdao(user)) {
        return NextResponse.json(
          { success: false, message: 'Only SDAO Office can approve or reject events' },
          { status: 403 }
        )
      }

      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: 'Invalid event id' },
          { status: 400 }
        )
      }

      const update = action === 'approve'
        ? {
            status: 'approved',
            approvedBy: user.id,
            approvedByUsername: user.username,
            approvedAt: new Date(),
            rejectionReason: null,
          }
        : {
            status: 'rejected',
            rejectedBy: user.id,
            rejectedByUsername: user.username,
            rejectedAt: new Date(),
            rejectionReason: reason || '',
          }

      const result = await eventsCollection.updateOne(
        { _id: new ObjectId(id), status: 'pending' },
        { $set: update }
      )

      return NextResponse.json({
        success: result.modifiedCount === 1,
        message: result.modifiedCount === 1 ? `Event ${action}d` : 'No pending event found',
      })
    }

    if (action === 'update' || action === 'delete') {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: 'Invalid event id' },
          { status: 400 }
        )
      }

      const existingEvent = await eventsCollection.findOne({ _id: new ObjectId(id) })
      const canModify = isSdao(user)
        || (isStudentOrganization(user) && existingEvent?.createdBy === user.id && existingEvent?.status === 'pending')

      if (!existingEvent || !canModify) {
        return NextResponse.json(
          { success: false, message: 'You can only edit or remove requests you are allowed to manage' },
          { status: 403 }
        )
      }

      if (action === 'delete') {
        await eventsCollection.deleteOne({ _id: new ObjectId(id) })
        return NextResponse.json({ success: true, message: 'Event removed' })
      }

      await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            title,
            description,
            date,
            time,
            endTime,
            end_time: endTime,
            location,
            facilityId,
            updatedAt: new Date(),
            updatedBy: user.id,
            updatedByUsername: user.username,
          },
        }
      )

      return NextResponse.json({ success: true, message: 'Event updated' })
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
