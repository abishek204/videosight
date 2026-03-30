'use server';

import { getDatabase } from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { sign, verify } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';



const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '86400000'); // 1 day

export async function registerAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return { success: false, error: 'User already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await usersCollection.insertOne({
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      createdAt: new Date(),
    });


    const user = {
      id: result.insertedId.toString(),
      uid: result.insertedId.toString(),
      email,
      name: name || email.split('@')[0],
      isLoggedIn: true,
      isAnonymous: false,
    };

    const token = sign(user, JWT_SECRET, { expiresIn: '24h' });
    const cookieStore = await cookies();
    cookieStore.set('vidinsight_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: JWT_EXPIRATION / 1000,
      path: '/',
    });

    return { success: true, user };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const userDoc = await usersCollection.findOne({ email });
    if (!userDoc) {
      return { success: false, error: 'Invalid email or password' };
    }

    const isPasswordValid = await bcrypt.compare(password, userDoc.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password' };
    }


    const user = {
      id: userDoc._id.toString(),
      uid: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name,
      isLoggedIn: true,
      isAnonymous: false,
    };

    const token = sign(user, JWT_SECRET, { expiresIn: '24h' });
    const cookieStore = await cookies();
    cookieStore.set('vidinsight_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: JWT_EXPIRATION / 1000,
      path: '/',
    });

    console.log(`✅ Login successful for user: ${email} (${userDoc._id})`);
    return { success: true, user };
  } catch (error) {
    console.error('❌ Login error:', error);
    return { success: false, error: 'Login failed' };
  }
}


export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('vidinsight_auth');
  return { success: true };
}

export async function getCurrentUserAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get('vidinsight_auth')?.value;

  if (!token) {
    console.log('ℹ️ No auth token found in cookies');
    return null;
  }

  try {
    const decoded = verify(token, JWT_SECRET) as any;
    console.log('✅ Auth token verified for user:', decoded.email);
    return decoded;
  } catch (error) {
    console.error('❌ Auth token verification failed:', error);
    return null;
  }
}

