import { Markdown } from './src/components/detail/Markdown'
import { render } from '@testing-library/react'

const { container } = render(<Markdown source="Use `const x = 5` in your code." />)
console.log(container.innerHTML)
const code = container.querySelector('code')
console.log('Code element:', code)
console.log('Classes:', code?.className)
