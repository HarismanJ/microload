import { createContext, useContext } from 'react'

const UserContext = createContext(null)

export function UserProvider({ user, children }) {
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  )
}

export function useCurrentUser() {
  const user = useContext(UserContext)
  if (!user) {
    throw new Error('useCurrentUser must be used within UserProvider')
  }
  return user
}

export function useCurrentUserId() {
  return useCurrentUser().id
}
