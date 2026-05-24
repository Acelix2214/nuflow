import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 10,
}

let client
let clientPromise

function getMongoUriError(uri) {
  if (!uri) {
    return 'Please add MONGODB_URI to .env.local'
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    return 'MONGODB_URI must start with mongodb:// or mongodb+srv://'
  }

  if (uri.startsWith('mongodb+srv://')) {
    try {
      const parsedUri = new URL(uri)
      if (parsedUri.hostname === 'cluster0.mongodb.net') {
        return 'MONGODB_URI has an incomplete Atlas hostname. Use the full host from Atlas, like cluster0.xxxxx.mongodb.net'
      }
    } catch {
      return 'MONGODB_URI in .env.local is not a valid MongoDB connection string'
    }
  }

  return null
}

export function getDatabaseConnectionMessage(error) {
  if (error?.message?.includes('querySrv')) {
    return 'Database connection failed. Check the MongoDB Atlas hostname in MONGODB_URI.'
  }

  if (error?.message?.includes('bad auth') || error?.message?.includes('Authentication failed')) {
    return 'Database connection failed. Check the MongoDB username and password in MONGODB_URI.'
  }

  return error?.message || 'Database connection failed. Please check MONGODB_URI in .env.local.'
}

export function getMongoClient() {
  const uriError = getMongoUriError(uri)
  if (uriError) {
    throw new Error(uriError)
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options)
      global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
  } else if (!clientPromise) {
    client = new MongoClient(uri, options)
    clientPromise = client.connect()
  }

  return clientPromise
}

export default getMongoClient
