import type { AuthUser } from '../shared/types'

export type AppVariables = {
  user: AuthUser
}

export type AppEnv = {
  Variables: AppVariables
}
