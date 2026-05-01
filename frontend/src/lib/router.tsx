import { createBrowserRouter, Navigate, RouteObject } from 'react-router-dom'
import { Board } from '../routes/Board'
import { Epics } from '../routes/Epics'
import { TaskDetail } from '../routes/TaskDetail'
import { EpicDetail } from '../routes/EpicDetail'

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
    path: '/tasks/:id',
    element: <TaskDetail />,
  },
  {
    path: '/epics/:id',
    element: <EpicDetail />,
  },
  {
    path: '*',
    element: <Navigate to="/board" replace />,
  },
]

export const router = createBrowserRouter(routes)
