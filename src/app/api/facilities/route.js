import { NextResponse } from 'next/server'
import { getMongoClient, getDatabaseConnectionMessage } from '@/lib/mongodb'

export async function GET(request) {
  try {
    let client, db, facilitiesCollection
    try {
      client = await getMongoClient()
      db = client.db('nuflow')
      facilitiesCollection = db.collection('facilities')
    } catch (dbError) {
      console.error('[NU Flow] Database connection error:', dbError.message)
      return NextResponse.json(
        { success: false, message: getDatabaseConnectionMessage(dbError) },
        { status: 500 }
      )
    }

    const facilities = await facilitiesCollection.find({}).toArray()

    return NextResponse.json({
      success: true,
      data: facilities.map(facility => ({
        ...facility,
        id: facility._id.toString(),
      })),
    })
  } catch (error) {
    console.error('Facilities error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
