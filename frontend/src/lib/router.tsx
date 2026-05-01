import { createBrowserRouter, Navigate, RouteObject } from 'react-router-dom'
import { Board } from '../routes/Board'
import { Epics } from '../routes/Epics'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/board" replace />,
  },
  {
    path: '/board',
    element: <Board />,
  },
  {
    path: '/epics',
    element: <Epics />,
  },
  {
    path: '*',
    element: <Navigate to="/board" replace />,
  },
]

export const router = createBrowserRouter(routes)
