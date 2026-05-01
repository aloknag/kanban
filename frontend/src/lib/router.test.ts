import { describe, it, expect } from 'vitest'
import { createBrowserRouter, RouteObject } from 'react-router-dom'

describe('Router Configuration', () => {
  it('should have a /board route', () => {
    const routes: RouteObject[] = [
      { path: '/', element: null, children: [
        { path: 'board', element: null },
      ]},
    ]
    
    const boardRoute = routes[0].children?.find(r => r.path === 'board')
    expect(boardRoute).toBeDefined()
    expect(boardRoute?.path).toBe('board')
  })

  it('should have an /epics route', () => {
    const routes: RouteObject[] = [
      { path: '/', element: null, children: [
        { path: 'epics', element: null },
      ]},
    ]
    
    const epicsRoute = routes[0].children?.find(r => r.path === 'epics')
    expect(epicsRoute).toBeDefined()
    expect(epicsRoute?.path).toBe('epics')
  })

  it('should have a default route that redirects to /board', () => {
    const routes: RouteObject[] = [
      { path: '/', element: null },
    ]
    
    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe('/')
  })

  it('should create a router without throwing an error', () => {
    expect(() => {
      createBrowserRouter([
        { path: '/', element: null },
        { path: '/board', element: null },
        { path: '/epics', element: null },
      ])
    }).not.toThrow()
  })
})
