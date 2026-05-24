import { NextResponse } from 'next/server'
import { getMongoClient, getDatabaseConnectionMessage } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getSessionUser, isSdao, isStudentOrganization } from '@/lib/auth'

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

    const user = await getSessionUser(request)
    const query = isSdao(user)
      ? {}
      : user
        ? { $or: [{ status: 'approved' }, { createdBy: user.id }] }
        : { status: 'approved' }

    const announcements = await announcementsCollection
      .find(query)
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
    const { action, title, content, id, reason } = body

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
          { success: false, message: 'Only SDAO and student organizations can create announcements' },
          { status: 403 }
        )
      }

      const result = await announcementsCollection.insertOne({
        title,
        content,
        createdBy: user.id,
        createdByUsername: user.username,
        status: isSdao(user) ? 'approved' : 'pending',
        createdAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: 'Announcement created',
        announcementId: result.insertedId.toString(),
      })
    }

    if (action === 'approve' || action === 'reject') {
      if (!isSdao(user)) {
        return NextResponse.json(
          { success: false, message: 'Only SDAO Office can approve or reject announcements' },
          { status: 403 }
        )
      }

      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: 'Invalid announcement id' },
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

      const result = await announcementsCollection.updateOne(
        { _id: new ObjectId(id), status: 'pending' },
        { $set: update }
      )

      return NextResponse.json({
        success: result.modifiedCount === 1,
        message: result.modifiedCount === 1 ? `Announcement ${action}d` : 'No pending announcement found',
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
