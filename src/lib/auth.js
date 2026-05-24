import { ObjectId } from 'mongodb'
import { getMongoClient } from '@/lib/mongodb'

export async function getSessionUser(request) {
  const sessionCookie = request.cookies.get('session_user')

  if (!sessionCookie) {
    return null
  }

  let sessionUser
  try {
    sessionUser = JSON.parse(sessionCookie.value)
  } catch {
    return null
  }

  if (!sessionUser?.id || !ObjectId.isValid(sessionUser.id)) {
    return null
  }

  const client = await getMongoClient()
  const user = await client.db('nuflow').collection('users').findOne({ _id: new ObjectId(sessionUser.id) })

  if (!user || user.status === 'inactive') {
    return null
  }

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role || 'Student Organizations',
  }
}

export function isSdao(user) {
  return user?.role === 'SDAO Office'
}

export function isStudentOrganization(user) {
  return user?.role === 'Student Organizations'
}
