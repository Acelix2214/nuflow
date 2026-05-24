import { NextResponse } from 'next/server'
import { hash, compare } from 'bcryptjs'
import { getMongoClient, getDatabaseConnectionMessage } from '@/lib/mongodb'

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, username, password, email, organization } = body

    let client, db, usersCollection
    try {
      client = await getMongoClient()
      db = client.db('nuflow')
      usersCollection = db.collection('users')
    } catch (dbError) {
      console.error('[NU Flow] Database connection error:', dbError.message)
      return NextResponse.json(
        { success: false, message: getDatabaseConnectionMessage(dbError) },
        { status: 500 }
      )
    }

    switch (action) {
      case 'login': {
        const user = await usersCollection.findOne({ username })

        if (!user) {
          return NextResponse.json(
            { success: false, message: 'Invalid username or password' },
            { status: 401 }
          )
        }

        const isPasswordValid = await compare(password, user.password)

        if (!isPasswordValid) {
          return NextResponse.json(
            { success: false, message: 'Invalid username or password' },
            { status: 401 }
          )
        }

        // Create session (you'd normally use JWT here)
        const response = NextResponse.json({
          success: true,
          message: 'Login successful',
          user: {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role || 'Student Organizations',
          },
        })

        response.cookies.set('session_user', JSON.stringify({
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role || 'Student Organizations',
        }), { maxAge: 86400 * 7 })

        return response
      }

      case 'register': {
        // Check if user exists
        const existingUser = await usersCollection.findOne({
          $or: [{ username }, { email }],
        })

        if (existingUser) {
          return NextResponse.json(
            { success: false, message: 'Username or email already exists' },
            { status: 400 }
          )
        }

        // Hash password
        const hashedPassword = await hash(password, 10)

        // Create user
        const result = await usersCollection.insertOne({
          username,
          email,
          password: hashedPassword,
          organization,
          role: 'Student Organizations',
          createdAt: new Date(),
          status: 'active',
        })

        return NextResponse.json({
          success: true,
          message: 'Registration successful',
          user: {
            id: result.insertedId.toString(),
            username,
            email,
            role: 'Student Organizations',
          },
        })
      }

      case 'check_session': {
        const sessionCookie = request.cookies.get('session_user')

        if (!sessionCookie) {
          return NextResponse.json(
            { success: false, message: 'No session' },
            { status: 401 }
          )
        }

        try {
          const user = JSON.parse(sessionCookie.value)
          return NextResponse.json({
            success: true,
            user_id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          })
        } catch (e) {
          return NextResponse.json(
            { success: false, message: 'Invalid session' },
            { status: 401 }
          )
        }
      }

      case 'logout': {
        const response = NextResponse.json({ success: true })
        response.cookies.delete('session_user')
        return response
      }

      default:
        return NextResponse.json(
          { success: false, message: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    )
  }
}
