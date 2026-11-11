import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'

export interface AuthResult {
  error: any
  fieldErrors: FieldErrors
  message: string
}

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(pb.authStore.isValid ? pb.authStore.record : null)
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? record : null)
      setIsAuthenticated(pb.authStore.isValid)
    })
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }
    return () => {
      unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, name: string): Promise<AuthResult> => {
    try {
      await pb
        .collection('users')
        .create({ email, password, passwordConfirm: password, name, role: 'producer' })
      await pb.collection('users').authWithPassword(email, password)
      return { error: null, fieldErrors: {}, message: '' }
    } catch (error) {
      return {
        error,
        fieldErrors: extractFieldErrors(error),
        message: getErrorMessage(error),
      }
    }
  }

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null, fieldErrors: {}, message: '' }
    } catch (error) {
      return {
        error,
        fieldErrors: extractFieldErrors(error),
        message: getErrorMessage(error),
      }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
